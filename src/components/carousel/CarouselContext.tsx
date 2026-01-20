"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CarouselItem,
  CarouselState,
  CarouselContextValue,
  CarouselOptions,
  CarouselProgress,
  CarouselDirection,
} from "@/types";
import { createBrowserClient } from "@/lib/supabase/client";

const CarouselContext = createContext<CarouselContextValue | null>(null);

/** Get localStorage key for carousel progress */
function getStorageKey(companySlug: string, roleSlug: string): string {
  return `carousel-${companySlug}-${roleSlug}`;
}

/** Load carousel progress from localStorage */
function loadPersistedProgress(
  companySlug: string,
  roleSlug: string
): CarouselProgress | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getStorageKey(companySlug, roleSlug));
    if (!stored) return null;

    const progress = JSON.parse(stored) as CarouselProgress;
    return progress;
  } catch {
    return null;
  }
}

/** Cookie name for carousel progress */
function getCookieKey(companySlug: string, roleSlug: string): string {
  return `carousel_progress_${companySlug}_${roleSlug}`;
}

/** Save carousel progress to localStorage and cookie */
function persistProgress(progress: CarouselProgress): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getStorageKey(progress.companySlug, progress.roleSlug),
      JSON.stringify(progress)
    );
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }

  // Also save to cookie for SSR access
  try {
    const cookieValue = JSON.stringify({
      currentIndex: progress.currentIndex,
      completedItems: progress.completedItems,
    });
    // Set cookie with 1 year expiry, SameSite=Lax for security
    document.cookie = `${getCookieKey(progress.companySlug, progress.roleSlug)}=${encodeURIComponent(cookieValue)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignore cookie errors
  }
}

/**
 * Load carousel progress from Supabase journey_progress table
 * Returns null if not authenticated or no saved progress
 */
async function loadFromSupabase(
  companySlug: string,
  roleSlug: string
): Promise<CarouselProgress | null> {
  try {
    const supabase = createBrowserClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Use journey_id format: carousel-{company}-{role}
    const journeyId = `carousel-${companySlug}-${roleSlug}`;

    const { data, error } = await supabase
      .from("journey_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("journey_id", journeyId)
      .single();

    if (error || !data) return null;

    // Convert Supabase row to CarouselProgress
    // The journey_progress table stores: current_step_index, completed_steps (array)
    return {
      companySlug,
      roleSlug,
      currentIndex: data.current_step_index,
      completedItems: data.completed_steps || [],
      lastUpdated: new Date(data.last_updated).getTime(),
    };
  } catch {
    return null;
  }
}

/**
 * Save carousel progress to Supabase journey_progress table
 * No-op if user is not authenticated
 */
async function saveToSupabase(progress: CarouselProgress): Promise<boolean> {
  try {
    const supabase = createBrowserClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Use journey_id format: carousel-{company}-{role}
    const journeyId = `carousel-${progress.companySlug}-${progress.roleSlug}`;

    const { error } = await supabase.from("journey_progress").upsert(
      {
        user_id: user.id,
        journey_id: journeyId,
        current_step_index: progress.currentIndex,
        completed_steps: progress.completedItems,
        answers: [], // Carousel doesn't use answers, but field may be required
        last_updated: new Date(progress.lastUpdated).toISOString(),
      },
      {
        onConflict: "user_id,journey_id",
      }
    );

    return !error;
  } catch {
    return false;
  }
}

interface CarouselProviderProps {
  options: CarouselOptions;
  children: ReactNode;
  /** Enable Supabase sync for logged-in users (default: true) */
  enableSupabaseSync?: boolean;
}

export function CarouselProvider({
  options,
  children,
  enableSupabaseSync = true,
}: CarouselProviderProps) {
  const {
    companySlug,
    roleSlug,
    items,
    paywallIndex = null,
    hasPremiumAccess: initialHasPremiumAccess = false,
    initialIndex,
    initialCompletedItems,
  } = options;

  // Track premium access as state so it can be updated when user unlocks
  const [hasPremiumAccess, setHasPremiumAccess] = useState(initialHasPremiumAccess);

  // Track if Supabase state has been loaded
  const supabaseLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  // Track if user has navigated - prevents async Supabase load from overwriting
  const hasNavigatedRef = useRef(false);

  // Load persisted state or use defaults
  const [currentIndex, setCurrentIndex] = useState(() => {
    // If initialIndex is provided, use it
    if (initialIndex !== undefined) return initialIndex;

    // Otherwise try to load from localStorage
    const persisted = loadPersistedProgress(companySlug, roleSlug);
    if (persisted) return persisted.currentIndex;
    return 0;
  });

  const [completedItems, setCompletedItems] = useState<Set<string>>(() => {
    // If initialCompletedItems is provided, use it
    if (initialCompletedItems) return new Set(initialCompletedItems);

    // Otherwise try to load from localStorage
    const persisted = loadPersistedProgress(companySlug, roleSlug);
    if (persisted) return new Set(persisted.completedItems);
    return new Set<string>();
  });

  const [isPaused, setIsPaused] = useState(false);
  const [lastDirection, setLastDirection] = useState<CarouselDirection | null>(
    null
  );

  // Persist state to localStorage and cookie whenever it changes
  useEffect(() => {
    const progress: CarouselProgress = {
      companySlug,
      roleSlug,
      currentIndex,
      completedItems: Array.from(completedItems),
      lastUpdated: Date.now(),
    };

    persistProgress(progress);
  }, [companySlug, roleSlug, currentIndex, completedItems]);

  // Supabase sync: Load from Supabase on mount (once)
  // Skip if initialIndex was explicitly provided (e.g., from URL ?start= param)
  useEffect(() => {
    if (!enableSupabaseSync || supabaseLoadedRef.current) return;
    if (initialIndex !== undefined) {
      // Don't override explicit starting position
      supabaseLoadedRef.current = true;
      return;
    }
    supabaseLoadedRef.current = true;

    const localProgress = loadPersistedProgress(companySlug, roleSlug);
    const localTimestamp = localProgress?.lastUpdated ?? 0;

    loadFromSupabase(companySlug, roleSlug).then((remoteProgress) => {
      // Don't override if user has already navigated
      if (hasNavigatedRef.current) return;

      if (remoteProgress && remoteProgress.lastUpdated > localTimestamp) {
        // Remote state is newer, apply it
        setCurrentIndex(remoteProgress.currentIndex);
        setCompletedItems(new Set(remoteProgress.completedItems));
      }
    });
  }, [companySlug, roleSlug, enableSupabaseSync, initialIndex]);

  // Ref to hold latest index for marking items complete (avoids stale closure)
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Ref to hold latest state for debounced save (avoids stale closure)
  const latestStateRef = useRef({ currentIndex, completedItems });
  useEffect(() => {
    latestStateRef.current = { currentIndex, completedItems };
  }, [currentIndex, completedItems]);

  // Supabase sync: Save to Supabase on state changes (debounced 1 second)
  useEffect(() => {
    if (!enableSupabaseSync) return;

    const stateKey = JSON.stringify({
      currentIndex,
      completedItems: Array.from(completedItems),
    });

    // Skip if state hasn't changed
    if (stateKey === lastSavedRef.current) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
      // Use ref to get latest values, not stale closure values
      const latest = latestStateRef.current;
      const progress: CarouselProgress = {
        companySlug,
        roleSlug,
        currentIndex: latest.currentIndex,
        completedItems: Array.from(latest.completedItems),
        lastUpdated: Date.now(),
      };

      const latestStateKey = JSON.stringify({
        currentIndex: latest.currentIndex,
        completedItems: Array.from(latest.completedItems),
      });

      saveToSupabase(progress).then((success) => {
        if (success) {
          lastSavedRef.current = latestStateKey;
        }
      });
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [companySlug, roleSlug, currentIndex, completedItems, enableSupabaseSync]);

  // Derived values
  const safeIndex = Math.max(0, Math.min(currentIndex, items.length - 1));
  const currentItem = items.length > 0 ? (items[safeIndex] ?? null) : null;
  const totalItems = items.length;
  const completedCount = completedItems.size;
  const progress =
    totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const isFirstItem = safeIndex === 0;
  const isLastItem = safeIndex === items.length - 1;

  // Check if currently at paywall
  const isAtPaywall = useMemo(() => {
    if (paywallIndex === null) return false;
    if (hasPremiumAccess) return false;
    return safeIndex >= paywallIndex;
  }, [paywallIndex, hasPremiumAccess, safeIndex]);

  // Check if can navigate next
  const canGoNext = useMemo(() => {
    if (isLastItem) return false;
    // If at paywall without premium access, can't go next
    if (isAtPaywall) return false;
    // If paywallIndex is set and next item would be at/after paywall without access
    if (
      paywallIndex !== null &&
      !hasPremiumAccess &&
      safeIndex + 1 >= paywallIndex
    ) {
      return false;
    }
    return true;
  }, [isLastItem, isAtPaywall, paywallIndex, hasPremiumAccess, safeIndex]);

  // Check if can navigate prev
  const canGoPrev = useMemo(() => {
    return !isFirstItem;
  }, [isFirstItem]);

  // Navigation actions
  const next = useCallback(() => {
    if (!canGoNext) return;

    // Mark that user has navigated (prevents async Supabase load from overwriting)
    hasNavigatedRef.current = true;

    // Mark current item as complete when navigating forward
    // Use ref to get latest index, avoiding stale closure issues
    const idx = currentIndexRef.current;
    const currentItem = items[idx];
    if (currentItem && currentItem.type !== "paywall") {
      setCompletedItems((prev) => {
        const next = new Set(prev);
        next.add(currentItem.id);
        return next;
      });
    }

    setLastDirection("next");
    setCurrentIndex((prevIndex) => {
      let newIndex = prevIndex + 1;
      // Skip paywall when going forward if user has premium access
      if (hasPremiumAccess && paywallIndex !== null && newIndex === paywallIndex) {
        newIndex = paywallIndex + 1;
      }
      return Math.min(newIndex, items.length - 1);
    });
  }, [canGoNext, items, hasPremiumAccess, paywallIndex]);

  const prev = useCallback(() => {
    if (!canGoPrev) return;

    // Mark that user has navigated (prevents async Supabase load from overwriting)
    hasNavigatedRef.current = true;

    setLastDirection("prev");
    setCurrentIndex((prevIndex) => {
      let newIndex = prevIndex - 1;
      // Skip paywall when going backward if user has premium access
      if (hasPremiumAccess && paywallIndex !== null && newIndex === paywallIndex) {
        newIndex = paywallIndex - 1;
      }
      return Math.max(newIndex, 0);
    });
  }, [canGoPrev, hasPremiumAccess, paywallIndex]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return;

      // Check paywall restriction
      if (paywallIndex !== null && !hasPremiumAccess && index >= paywallIndex) {
        // Can't navigate to premium items without access
        return;
      }

      // Mark that user has navigated (prevents async Supabase load from overwriting)
      hasNavigatedRef.current = true;

      // Set direction based on whether we're going forward or backward
      setLastDirection(index > currentIndex ? "next" : "prev");
      setCurrentIndex(index);
    },
    [items.length, paywallIndex, hasPremiumAccess, currentIndex]
  );

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const markComplete = useCallback((itemId: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
  }, []);

  // Synchronously save progress - use before navigation to ensure data is persisted
  // Optional itemIdToInclude adds an item that was just marked complete but hasn't hit state yet
  const saveProgressNow = useCallback((itemIdToInclude?: string) => {
    const currentCompleted = latestStateRef.current.completedItems;
    const completedArray = Array.from(currentCompleted);
    // Include the item if provided and not already in the set
    if (itemIdToInclude && !currentCompleted.has(itemIdToInclude)) {
      completedArray.push(itemIdToInclude);
    }
    const progress: CarouselProgress = {
      companySlug,
      roleSlug,
      currentIndex: currentIndexRef.current,
      completedItems: completedArray,
      lastUpdated: Date.now(),
    };
    persistProgress(progress);
    // Also trigger async Supabase save
    saveToSupabase(progress);
  }, [companySlug, roleSlug]);

  // Unlock paywall and advance to next item
  const unlockPaywall = useCallback(() => {
    setHasPremiumAccess(true);
    // Advance to next item after unlocking
    setLastDirection("next");
    setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1));
  }, [items.length]);

  // Build state object
  const state: CarouselState = useMemo(
    () => ({
      currentIndex: safeIndex,
      items,
      isPaused,
      paywallIndex,
      hasPremiumAccess,
      completedItems,
      lastDirection,
    }),
    [
      safeIndex,
      items,
      isPaused,
      paywallIndex,
      hasPremiumAccess,
      completedItems,
      lastDirection,
    ]
  );

  // Build context value
  const value = useMemo<CarouselContextValue>(
    () => ({
      state,
      currentItem,
      progress,
      totalItems,
      completedCount,
      isFirstItem,
      isLastItem,
      isAtPaywall,
      companySlug,
      roleSlug,
      next,
      prev,
      goTo,
      pause,
      resume,
      markComplete,
      unlockPaywall,
      saveProgressNow,
      canGoNext,
      canGoPrev,
    }),
    [
      state,
      currentItem,
      progress,
      totalItems,
      completedCount,
      isFirstItem,
      isLastItem,
      isAtPaywall,
      companySlug,
      roleSlug,
      next,
      prev,
      goTo,
      pause,
      resume,
      markComplete,
      unlockPaywall,
      saveProgressNow,
      canGoNext,
      canGoPrev,
    ]
  );

  return (
    <CarouselContext.Provider value={value}>
      {children}
    </CarouselContext.Provider>
  );
}

/**
 * Hook to access carousel state and actions
 * Must be used within a CarouselProvider
 */
export function useCarousel(): CarouselContextValue {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a CarouselProvider");
  }
  return context;
}
