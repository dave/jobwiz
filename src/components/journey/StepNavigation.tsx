"use client";

import { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useJourney } from "./JourneyContext";

export interface StepNavigationProps {
  /** Custom class name for the container */
  className?: string;
  /** Callback when navigation buttons are clicked */
  onNavigate?: (direction: "prev" | "next" | "complete") => void;
}

export function StepNavigation({
  className,
  onNavigate,
}: StepNavigationProps) {
  const {
    canAdvance,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    markComplete,
    currentStep,
  } = useJourney();

  const handlePrev = useCallback(() => {
    prevStep();
    onNavigate?.("prev");
  }, [prevStep, onNavigate]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      markComplete(currentStep.id);
      onNavigate?.("complete");
    } else {
      nextStep();
      onNavigate?.("next");
    }
  }, [isLastStep, nextStep, markComplete, currentStep, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "Enter" && canAdvance) {
        event.preventDefault();
        handleNext();
      } else if (event.key === "Escape" && !isFirstStep) {
        event.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAdvance, isFirstStep, handleNext, handlePrev]);

  return (
    <nav
      className={cn(
        "flex items-center justify-between gap-4 p-4",
        className
      )}
      aria-label="Journey navigation"
    >
      {/* Back button - hidden on first step */}
      {!isFirstStep ? (
        <button
          type="button"
          onClick={handlePrev}
          className={cn(
            "min-h-[44px] min-w-[44px] px-6 py-3",
            "rounded-lg border border-gray-300",
            "bg-white text-gray-700",
            "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500",
            "transition-colors duration-200",
            "font-medium"
          )}
          aria-label="Go back to previous step"
        >
          Back
        </button>
      ) : (
        // Spacer to maintain layout
        <div className="min-w-[44px]" />
      )}

      {/* Next/Complete button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!canAdvance && !isLastStep}
        className={cn(
          "min-h-[44px] min-w-[44px] px-6 py-3",
          "rounded-lg",
          "font-medium transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          canAdvance || isLastStep
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        )}
        aria-label={isLastStep ? "Complete journey" : "Continue to next step"}
      >
        {isLastStep ? "Complete" : "Continue"}
      </button>
    </nav>
  );
}
