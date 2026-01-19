"use client";

import { type ReactNode, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { JourneyProvider } from "./JourneyContext";
import { StepNavigation } from "./StepNavigation";
import { ProgressBar } from "./ProgressBar";
import { Timeline } from "./Timeline";
import { useJourney } from "./JourneyContext";
import type { JourneyConfig } from "@/types";

/**
 * @deprecated Use CarouselContainer and CarouselProvider from @/components/carousel instead.
 * This component uses the old timeline-based journey UI. The carousel UX provides
 * a better full-screen, one-item-at-a-time experience.
 * @see CarouselContainer
 * @see CarouselProvider
 */
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
  /** Show sidebar timeline on desktop (default: true) */
  showSidebar?: boolean;
}

function JourneyContainerInner({
  children,
  className,
  onComplete,
  showSidebar = true,
}: Omit<JourneyContainerProps, "config" | "initialStepIndex">) {
  const {
    currentStep,
    currentStepIndex,
    config,
    progress,
    completedSteps,
    isLastStep,
  } = useJourney();

  // Track navigation direction for animation
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  const handleNavigate = useCallback((direction: "prev" | "next" | "complete") => {
    // Set animation direction before navigation completes
    setSlideDirection(direction === "prev" ? "left" : "right");

    if (direction === "complete" && onComplete) {
      onComplete();
    }
  }, [onComplete]);

  return (
    <div
      className={cn(
        // Base styles - full height flexbox
        "flex flex-col min-h-screen",
        // Desktop: horizontal layout with sidebar
        "lg:flex-row",
        // Mobile-first responsive design
        "bg-white",
        className
      )}
    >
      {/* Desktop sidebar with Timeline - hidden on mobile/tablet */}
      {showSidebar && (
        <aside
          className={cn(
            // Hidden on mobile, visible on desktop
            "hidden lg:flex lg:flex-col",
            // Fixed width sidebar
            "lg:w-72 lg:min-w-[288px]",
            // Sticky positioning
            "lg:sticky lg:top-0 lg:h-screen",
            // Styling
            "bg-gray-50 border-r border-gray-200",
            // Padding
            "lg:p-6"
          )}
        >
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Your Progress
            </h2>
            <ProgressBar
              progress={progress}
              totalSteps={config.steps.length}
              completedSteps={completedSteps.size}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <Timeline interactive />
          </div>
        </aside>
      )}

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Header with progress - shown on mobile/tablet, optional on desktop */}
        <header
          className={cn(
            "sticky top-0 z-10 bg-white border-b border-gray-200",
            // On desktop with sidebar, header is simpler
            showSidebar && "lg:border-b-0"
          )}
        >
          <div className="max-w-4xl mx-auto px-4 py-4 lg:px-8">
            <div className="flex items-center justify-between mb-2 lg:mb-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate lg:text-xl">
                {currentStep.title}
              </h1>
              <span className="text-sm text-gray-500 ml-4 shrink-0">
                Step {currentStepIndex + 1} of {config.steps.length}
              </span>
            </div>
            {/* Progress bar - hidden on desktop with sidebar */}
            <div className={cn(showSidebar && "lg:hidden")}>
              <ProgressBar
                progress={progress}
                totalSteps={config.steps.length}
                completedSteps={completedSteps.size}
              />
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            // Content padding with responsive sizing
            "px-4 py-6",
            "sm:px-6 sm:py-8",
            "lg:px-8 lg:py-10"
          )}
        >
          <div className="max-w-3xl mx-auto lg:max-w-2xl">
            {/* Step content with smooth transition */}
            <div
              key={currentStep.id}
              className={cn(
                // Animation classes - respects prefers-reduced-motion via CSS
                "motion-safe:animate-fade-in",
                slideDirection === "right"
                  ? "motion-safe:animate-slide-in-right"
                  : "motion-safe:animate-slide-in-left"
              )}
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

        {/* Bottom navigation - sticky on all viewports */}
        <footer
          className={cn(
            "sticky bottom-0 z-10",
            "bg-white border-t border-gray-200",
            "safe-area-inset-bottom"
          )}
        >
          <div className="max-w-4xl mx-auto lg:max-w-2xl">
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
    </div>
  );
}

/**
 * @deprecated Use CarouselContainer and CarouselProvider from @/components/carousel instead.
 * This component uses the old timeline-based journey UI. The carousel UX provides
 * a better full-screen, one-item-at-a-time experience.
 * @see CarouselContainer
 * @see CarouselProvider
 */
export function JourneyContainer({
  config,
  children,
  className,
  onComplete,
  initialStepIndex,
  showSidebar = true,
}: JourneyContainerProps) {
  return (
    <JourneyProvider config={config} initialStepIndex={initialStepIndex}>
      <JourneyContainerInner
        className={className}
        onComplete={onComplete}
        showSidebar={showSidebar}
      >
        {children}
      </JourneyContainerInner>
    </JourneyProvider>
  );
}
