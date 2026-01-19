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
  ConversationState,
  ConversationContextValue,
  ConversationDisplayMode,
  ConversationAnswer,
  ConversationMessage,
} from "@/types";
import { useCarousel } from "@/components/carousel";
import { createBrowserClient } from "@/lib/supabase/client";

const ConversationContext = createContext<ConversationContextValue | null>(
  null
);

/** Get localStorage key for conversation answers */
function getStorageKey(companySlug: string, roleSlug: string): string {
  return `conversation-${companySlug}-${roleSlug}`;
}

/** Persisted conversation state for localStorage */
interface PersistedConversation {
  answers: Record<string, ConversationAnswer>;
  lastUpdated: number;
}

/** Load conversation state from localStorage */
function loadPersistedConversation(
  companySlug: string,
  roleSlug: string
): PersistedConversation | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getStorageKey(companySlug, roleSlug));
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedConversation;
    return parsed;
  } catch {
    return null;
  }
}

/** Save conversation answers to localStorage */
function persistConversation(
  companySlug: string,
  roleSlug: string,
  answers: Record<string, ConversationAnswer>
): void {
  if (typeof window === "undefined") return;

  try {
    const data: PersistedConversation = {
      answers,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(
      getStorageKey(companySlug, roleSlug),
      JSON.stringify(data)
    );
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Load conversation answers from Supabase journey_progress table
 * Returns null if not authenticated or no saved progress
 */
async function loadAnswersFromSupabase(
  companySlug: string,
  roleSlug: string
): Promise<PersistedConversation | null> {
  try {
    const supabase = createBrowserClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Use journey_id format: conversation-{company}-{role}
    const journeyId = `conversation-${companySlug}-${roleSlug}`;

    const { data, error } = await supabase
      .from("journey_progress")
      .select("answers, last_updated")
      .eq("user_id", user.id)
      .eq("journey_id", journeyId)
      .single();

    if (error || !data) return null;

    // Convert answers array to Record format
    const answers: Record<string, ConversationAnswer> = {};
    const answersArray = data.answers as Array<{
      questionId: string;
      answer: { selectedIds: string[]; isCorrect?: boolean };
      timestamp: number;
    }>;

    if (Array.isArray(answersArray)) {
      for (const item of answersArray) {
        if (item.questionId && item.answer) {
          answers[item.questionId] = {
            selectedIds: item.answer.selectedIds || [],
            isCorrect: item.answer.isCorrect,
            timestamp: item.timestamp,
          };
        }
      }
    }

    return {
      answers,
      lastUpdated: new Date(data.last_updated).getTime(),
    };
  } catch {
    return null;
  }
}

/**
 * Save conversation answers to Supabase journey_progress table
 * No-op if user is not authenticated
 */
async function saveAnswersToSupabase(
  companySlug: string,
  roleSlug: string,
  answers: Record<string, ConversationAnswer>
): Promise<boolean> {
  try {
    const supabase = createBrowserClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Use journey_id format: conversation-{company}-{role}
    const journeyId = `conversation-${companySlug}-${roleSlug}`;

    // Convert Record to array format for Supabase
    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer: {
        selectedIds: answer.selectedIds,
        isCorrect: answer.isCorrect,
      },
      timestamp: answer.timestamp,
    }));

    const { error } = await supabase.from("journey_progress").upsert(
      {
        user_id: user.id,
        journey_id: journeyId,
        current_step_index: 0, // Not used for conversation, but may be required
        completed_steps: [], // Not used for conversation
        answers: answersArray,
        last_updated: new Date().toISOString(),
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

/** Generate a unique message ID */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface ConversationProviderProps {
  children: ReactNode;
  /** Initial display mode (default: 'big-question') */
  initialDisplayMode?: ConversationDisplayMode;
  /** Enable Supabase sync for logged-in users (default: true) */
  enableSupabaseSync?: boolean;
}

/**
 * ConversationProvider manages conversation state for the Lemonade UI.
 *
 * Must be nested inside CarouselProvider to access companySlug, roleSlug,
 * currentIndex, and completedItems from the carousel.
 */
export function ConversationProvider({
  children,
  initialDisplayMode = "big-question",
  enableSupabaseSync = true,
}: ConversationProviderProps) {
  // Get carousel context for integration
  const carousel = useCarousel();
  const { companySlug, roleSlug } = carousel;

  // Track if Supabase state has been loaded
  const supabaseLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // State for messages (not persisted - rebuilt on each session)
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  // State for answers (persisted to localStorage + Supabase)
  const [answers, setAnswers] = useState<Record<string, ConversationAnswer>>(
    () => {
      // Try to load from localStorage on initial render
      const persisted = loadPersistedConversation(companySlug, roleSlug);
      return persisted?.answers ?? {};
    }
  );

  // State for display mode
  const [displayMode, setDisplayModeState] =
    useState<ConversationDisplayMode>(initialDisplayMode);

  // Persist answers to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      persistConversation(companySlug, roleSlug, answers);
    }
  }, [companySlug, roleSlug, answers]);

  // Supabase sync: Load from Supabase on mount (once)
  useEffect(() => {
    if (!enableSupabaseSync || supabaseLoadedRef.current) return;
    supabaseLoadedRef.current = true;

    const localData = loadPersistedConversation(companySlug, roleSlug);
    const localTimestamp = localData?.lastUpdated ?? 0;

    loadAnswersFromSupabase(companySlug, roleSlug).then((remoteData) => {
      if (remoteData && remoteData.lastUpdated > localTimestamp) {
        // Remote state is newer, apply it
        setAnswers(remoteData.answers);
      }
    });
  }, [companySlug, roleSlug, enableSupabaseSync]);

  // Supabase sync: Save to Supabase on answer changes (debounced 1 second)
  useEffect(() => {
    if (!enableSupabaseSync) return;

    const stateKey = JSON.stringify(answers);

    // Skip if state hasn't changed
    if (stateKey === lastSavedRef.current) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
      saveAnswersToSupabase(companySlug, roleSlug, answers).then((success) => {
        if (success) {
          lastSavedRef.current = stateKey;
        }
      });
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [companySlug, roleSlug, answers, enableSupabaseSync]);

  // Actions
  const addMessage = useCallback(
    (sender: "alex" | "user", content: string, itemId: string): string => {
      const id = generateMessageId();
      const message: ConversationMessage = {
        id,
        sender,
        content,
        itemId,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, message]);
      return id;
    },
    []
  );

  const recordAnswer = useCallback(
    (itemId: string, selectedIds: string[], isCorrect?: boolean): void => {
      const answer: ConversationAnswer = {
        selectedIds,
        isCorrect,
        timestamp: Date.now(),
      };

      setAnswers((prev) => ({
        ...prev,
        [itemId]: answer,
      }));
    },
    []
  );

  const setDisplayMode = useCallback((mode: ConversationDisplayMode): void => {
    setDisplayModeState(mode);
  }, []);

  const clearMessages = useCallback((): void => {
    setMessages([]);
  }, []);

  const getAnswer = useCallback(
    (itemId: string): ConversationAnswer | undefined => {
      return answers[itemId];
    },
    [answers]
  );

  const hasAnswer = useCallback(
    (itemId: string): boolean => {
      return itemId in answers;
    },
    [answers]
  );

  // Build context value
  const value = useMemo<ConversationContextValue>(
    () => ({
      messages,
      answers,
      displayMode,
      addMessage,
      recordAnswer,
      setDisplayMode,
      clearMessages,
      getAnswer,
      hasAnswer,
    }),
    [
      messages,
      answers,
      displayMode,
      addMessage,
      recordAnswer,
      setDisplayMode,
      clearMessages,
      getAnswer,
      hasAnswer,
    ]
  );

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

/**
 * Hook to access conversation state and actions
 * Must be used within a ConversationProvider (which must be inside CarouselProvider)
 */
export function useConversation(): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversation must be used within a ConversationProvider"
    );
  }
  return context;
}
