"use client";

import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Total number of steps */
  totalSteps: number;
  /** Number of completed steps */
  completedSteps: number;
  /** Custom class name */
  className?: string;
}

export function ProgressBar({
  progress,
  totalSteps,
  completedSteps,
  className,
}: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar container */}
      <div
        className="h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completedSteps} of ${totalSteps} steps complete`}
      >
        {/* Progress fill */}
        <div
          className={cn(
            "h-full bg-blue-600 rounded-full",
            "transition-all duration-300 ease-out"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step count text */}
      <p className="mt-1 text-xs text-gray-500 text-right">
        {completedSteps} of {totalSteps} complete
      </p>
    </div>
  );
}
