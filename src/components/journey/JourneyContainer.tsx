"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { JourneyProvider } from "./JourneyContext";
import { StepNavigation } from "./StepNavigation";
import { ProgressBar } from "./ProgressBar";
import { useJourney } from "./JourneyContext";
import type { JourneyConfig } from "@/types";

export interface JourneyContainerProps {
  config: JourneyConfig;
  /** Render function for step content */
  children: (stepId: string, moduleId: string, sectionId?: string) => ReactNode;
  /** Custom class name */
  className?: string;
  /** Callback when journey is completed */
  onComplete?: () => void;
  /** Initial step index (for testing) */
  initialStepIndex?: number;
}

function JourneyContainerInner({
  children,
  className,
  onComplete,
}: Omit<JourneyContainerProps, "config" | "initialStepIndex">) {
  const {
    currentStep,
    currentStepIndex,
    config,
    progress,
    completedSteps,
    isLastStep,
  } = useJourney();

  const handleNavigate = (direction: "prev" | "next" | "complete") => {
    if (direction === "complete" && onComplete) {
      onComplete();
    }
  };

  return (
    <div
      className={cn(
        // Base styles - full height flexbox
        "flex flex-col min-h-screen",
        // Mobile-first responsive design
        "bg-white",
        className
      )}
    >
      {/* Header with progress */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {currentStep.title}
            </h1>
            <span className="text-sm text-gray-500 ml-4 shrink-0">
              Step {currentStepIndex + 1} of {config.steps.length}
            </span>
          </div>
          <ProgressBar
            progress={progress}
            totalSteps={config.steps.length}
            completedSteps={completedSteps.size}
          />
        </div>
      </header>

      {/* Main content area */}
      <main
        className={cn(
          "flex-1 overflow-y-auto",
          // Content padding with responsive max-width
          "px-4 py-6",
          "md:px-8 md:py-8",
          "lg:px-12"
        )}
      >
        <div className="max-w-3xl mx-auto">
          {/* Step content with smooth transition */}
          <div
            key={currentStep.id}
            className="animate-fade-in"
            role="region"
            aria-label={`Step ${currentStepIndex + 1}: ${currentStep.title}`}
            aria-current="step"
          >
            {children(
              currentStep.id,
              currentStep.moduleId,
              currentStep.sectionId
            )}
          </div>
        </div>
      </main>

      {/* Bottom navigation - fixed on mobile */}
      <footer
        className={cn(
          "sticky bottom-0 z-10",
          "bg-white border-t border-gray-200",
          "safe-area-inset-bottom"
        )}
      >
        <div className="max-w-4xl mx-auto">
          <StepNavigation onNavigate={handleNavigate} />
          {/* Estimated time hint */}
          {currentStep.estimatedMinutes && !isLastStep && (
            <p className="text-center text-xs text-gray-400 pb-2">
              ~{currentStep.estimatedMinutes} min
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}

export function JourneyContainer({
  config,
  children,
  className,
  onComplete,
  initialStepIndex,
}: JourneyContainerProps) {
  return (
    <JourneyProvider config={config} initialStepIndex={initialStepIndex}>
      <JourneyContainerInner
        className={className}
        onComplete={onComplete}
      >
        {children}
      </JourneyContainerInner>
    </JourneyProvider>
  );
}
