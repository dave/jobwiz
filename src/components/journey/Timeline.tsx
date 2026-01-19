"use client";

import { cn } from "@/lib/utils";
import { useJourney } from "./JourneyContext";
import type { StepStatus } from "@/types";

/**
 * @deprecated The Timeline component is no longer used in production.
 * The carousel UX (CarouselContainer, CarouselProvider) has replaced the
 * timeline-based journey UI. Use the carousel components for new features.
 * @see CarouselContainer
 * @see CarouselProvider
 */
export interface TimelineProps {
  /** Custom class name */
  className?: string;
  /** Whether clicking on steps is enabled */
  interactive?: boolean;
  /** Timeline orientation - vertical (default) or horizontal */
  orientation?: "vertical" | "horizontal";
}

function getStepStatus(
  stepIndex: number,
  currentIndex: number,
  completedSteps: Set<string>,
  stepId: string,
  paywallPosition?: number
): StepStatus {
  if (completedSteps.has(stepId)) return "completed";
  if (stepIndex === currentIndex) return "current";
  if (paywallPosition !== undefined && stepIndex >= paywallPosition) {
    return "locked";
  }
  return "upcoming";
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return (
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    case "locked":
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * @deprecated The Timeline component is no longer used in production.
 * The carousel UX (CarouselContainer, CarouselProvider) has replaced the
 * timeline-based journey UI. Use the carousel components for new features.
 * @see CarouselContainer
 * @see CarouselProvider
 */
export function Timeline({ className, interactive = true, orientation = "vertical" }: TimelineProps) {
  const {
    config,
    currentStepIndex,
    completedSteps,
    goToStep,
  } = useJourney();

  const paywallPosition = config.paywallConfig?.position;
  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      className={cn("w-full", className)}
      aria-label="Journey timeline"
    >
      <ul className={cn(
        "flex",
        isHorizontal ? "flex-row space-x-4 overflow-x-auto" : "flex-col space-y-1"
      )}>
        {config.steps.map((step, index) => {
          const status = getStepStatus(
            index,
            currentStepIndex,
            completedSteps,
            step.id,
            paywallPosition
          );

          const isClickable =
            interactive &&
            status !== "locked" &&
            (status === "completed" || index <= currentStepIndex);

          return (
            <li key={step.id} className={cn(
              "flex",
              isHorizontal ? "flex-col items-center" : "items-start"
            )}>
              {/* Step indicator */}
              <div className={cn(
                "flex items-center",
                isHorizontal ? "flex-row" : "flex-col mr-3"
              )}>
                <button
                  type="button"
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    "min-w-[44px] min-h-[44px]", // Touch target
                    "transition-colors duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    status === "completed" && "bg-green-600",
                    status === "current" && "bg-blue-600 ring-4 ring-blue-100",
                    status === "upcoming" && "bg-gray-200",
                    status === "locked" && "bg-gray-100",
                    isClickable && "cursor-pointer hover:opacity-80",
                    !isClickable && "cursor-default"
                  )}
                  aria-label={`${step.title} - ${status}`}
                  aria-current={status === "current" ? "step" : undefined}
                >
                  <StatusIcon status={status} />
                  {status !== "completed" && status !== "locked" && (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        status === "current" ? "text-white" : "text-gray-500"
                      )}
                    >
                      {index + 1}
                    </span>
                  )}
                </button>

                {/* Connector line */}
                {index < config.steps.length - 1 && (
                  <div
                    className={cn(
                      completedSteps.has(step.id)
                        ? "bg-green-600"
                        : "bg-gray-200",
                      isHorizontal ? "h-0.5 w-8 ml-1" : "w-0.5 h-8 mt-1"
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Step content */}
              <div className={cn(
                isHorizontal ? "text-center mt-2" : "flex-1 pt-1 pb-4"
              )}>
                <h3
                  className={cn(
                    "text-sm font-medium",
                    isHorizontal && "truncate max-w-[80px]",
                    status === "current" && "text-blue-700",
                    status === "completed" && "text-green-700",
                    status === "upcoming" && "text-gray-600",
                    status === "locked" && "text-gray-400"
                  )}
                >
                  {step.title}
                </h3>
                {step.estimatedMinutes && !isHorizontal && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    ~{step.estimatedMinutes} min
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
