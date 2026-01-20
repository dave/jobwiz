"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCarousel } from "./CarouselContext";

export interface CarouselContainerProps {
  /** Render function for current item content */
  children: ReactNode;
  /** Custom class name */
  className?: string;
  /** Callback when exit is triggered (Escape key) */
  onExit?: () => void;
  /** Minimum swipe distance in pixels to trigger navigation (default: 50) */
  swipeThreshold?: number;
}

/**
 * CarouselContainer - Main container for carousel UI
 *
 * Features:
 * - Full-screen single item display, no sidebar
 * - Slide animation (left/right based on direction)
 * - Keyboard navigation: Enter/ArrowRight=next, Escape=exit, ArrowLeft=prev
 * - Mobile swipe gestures
 * - Minimal chrome: Next/Back buttons, "X of Y" indicator
 */
export function CarouselContainer({
  children,
  className,
  onExit,
  swipeThreshold = 50,
}: CarouselContainerProps) {
  const {
    state,
    next,
    prev,
    canGoNext,
    canGoPrev,
    isFirstItem,
    isLastItem,
    isAtPaywall,
    totalItems,
    companySlug,
    roleSlug,
    currentItem,
    markComplete,
    saveProgressNow,
  } = useCarousel();

  const router = useRouter();
  const { currentIndex, lastDirection, paywallIndex, hasPremiumAccess } = state;

  // Detect when the next item is blocked by paywall (not at paywall yet, but can't go next)
  const isNextBlockedByPaywall =
    !canGoNext &&
    !isLastItem &&
    paywallIndex !== null &&
    !hasPremiumAccess &&
    currentIndex + 1 >= paywallIndex;

  // Touch handling state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case "Enter":
        case "ArrowRight":
          if (canGoNext) {
            event.preventDefault();
            next();
          }
          break;
        case "Escape":
          if (onExit) {
            event.preventDefault();
            onExit();
          }
          break;
        case "ArrowLeft":
          if (canGoPrev) {
            event.preventDefault();
            prev();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoNext, canGoPrev, next, prev, onExit]);

  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      setIsSwiping(true);
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!isSwiping || touchStartX.current === null) {
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        setIsSwiping(false);
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touchStartY.current !== null
        ? touch.clientY - touchStartY.current
        : 0;

      // Only trigger swipe if horizontal movement is greater than vertical
      // This prevents swipe navigation when scrolling
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (deltaX < 0 && canGoNext) {
          // Swiped left = next
          next();
        } else if (deltaX > 0 && canGoPrev) {
          // Swiped right = prev
          prev();
        }
      }

      setIsSwiping(false);
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [isSwiping, swipeThreshold, canGoNext, canGoPrev, next, prev]
  );

  const handleTouchCancel = useCallback(() => {
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  // Handle back button click
  const handleBack = useCallback(() => {
    if (canGoPrev) {
      prev();
    }
  }, [canGoPrev, prev]);

  // Handle next button click
  const handleNext = useCallback(() => {
    if (isAtPaywall || isNextBlockedByPaywall) {
      // Navigate to checkout page for premium upsell
      router.push(`/${companySlug}/${roleSlug}/checkout`);
    } else if (isLastItem) {
      // Mark last item complete and save progress before navigating away
      if (currentItem) {
        markComplete(currentItem.id);
        // Pass item ID to include since state update hasn't happened yet
        saveProgressNow(currentItem.id);
      } else {
        saveProgressNow();
      }
      // Navigate back to journey page when done
      router.push(`/${companySlug}/${roleSlug}/journey`);
    } else if (canGoNext) {
      next();
    }
  }, [canGoNext, next, isAtPaywall, isNextBlockedByPaywall, isLastItem, router, companySlug, roleSlug, currentItem, markComplete, saveProgressNow]);

  // Determine animation class based on last direction
  const animationClass =
    lastDirection === "prev"
      ? "motion-safe:animate-slide-in-left"
      : "motion-safe:animate-slide-in-right";

  return (
    <div
      className={cn(
        // Full-screen container
        "flex flex-col min-h-screen w-full",
        "bg-white",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Header with progress indicator */}
      <header
        className={cn(
          "sticky top-0 z-10",
          "bg-white border-b border-gray-200",
          "px-4 py-3",
          "sm:px-6"
        )}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Exit button (back arrow) */}
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className={cn(
                "min-h-[44px] min-w-[44px]",
                "flex items-center justify-center",
                "rounded-lg",
                "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                "transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500"
              )}
              aria-label="Exit carousel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : (
            <div className="min-w-[44px]" />
          )}

          {/* Progress indicator - X of Y */}
          <span
            className="text-sm font-medium text-gray-600"
            aria-live="polite"
            aria-atomic="true"
          >
            {currentIndex + 1} of {totalItems}
          </span>

          {/* Spacer for alignment */}
          <div className="min-w-[44px]" />
        </div>
      </header>

      {/* Main content area - single item display */}
      <main
        className={cn(
          "flex-1 overflow-y-auto",
          "px-4 py-6",
          "sm:px-6 sm:py-8",
          "lg:px-8 lg:py-10"
        )}
      >
        <div className="max-w-3xl mx-auto">
          {/* Content with slide animation */}
          <div
            key={`carousel-item-${currentIndex}`}
            className={cn(
              "motion-safe:animate-fade-in",
              animationClass
            )}
            role="region"
            aria-label={`Item ${currentIndex + 1} of ${totalItems}`}
            aria-current="step"
          >
            {children}
          </div>
        </div>
      </main>

      {/* Bottom navigation */}
      <footer
        className={cn(
          "sticky bottom-0 z-10",
          "bg-white border-t border-gray-200",
          "safe-area-inset-bottom"
        )}
      >
        <nav
          className="flex items-center justify-between gap-4 p-4 max-w-4xl mx-auto"
          aria-label="Carousel navigation"
        >
          {/* Back button - hidden on first item */}
          {!isFirstItem ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={!canGoPrev}
              className={cn(
                "min-h-[44px] min-w-[44px] px-6 py-3",
                "rounded-lg border border-gray-300",
                "font-medium transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                canGoPrev
                  ? "bg-white text-gray-700 hover:bg-gray-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
              aria-label="Go to previous item"
            >
              Back
            </button>
          ) : (
            // Spacer to maintain layout
            <div className="min-w-[44px]" />
          )}

          {/* Next button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext && !isLastItem && !isAtPaywall && !isNextBlockedByPaywall}
            className={cn(
              "min-h-[44px] min-w-[44px] px-6 py-3",
              "rounded-lg",
              "font-medium transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              canGoNext
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : isAtPaywall || isNextBlockedByPaywall
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : isLastItem
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
            aria-label={
              isAtPaywall || isNextBlockedByPaywall
                ? "Unlock premium content"
                : isLastItem
                  ? "Complete"
                  : "Go to next item"
            }
          >
            {isAtPaywall || isNextBlockedByPaywall ? "Unlock" : isLastItem ? "Done" : "Next"}
          </button>
        </nav>
      </footer>
    </div>
  );
}
