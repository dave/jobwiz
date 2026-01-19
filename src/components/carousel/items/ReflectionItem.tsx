"use client";

import { cn } from "@/lib/utils";
import type { QuizBlock } from "@/types/module";

export interface ReflectionItemProps {
  /** The quiz block to render as reflection */
  block: QuizBlock;
  /** Called when user clicks Continue */
  onComplete?: () => void;
  /** Custom class name */
  className?: string;
}

const ThoughtBubbleIcon = () => (
  <svg
    className="h-5 w-5 sm:h-6 sm:w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    className="h-5 w-5 sm:h-6 sm:w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const WarningTriangleIcon = () => (
  <svg
    className="h-5 w-5 sm:h-6 sm:w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const LightbulbIcon = () => (
  <svg
    className="h-5 w-5 sm:h-6 sm:w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

/**
 * ReflectionItem - Displays quizzes as reflection/guidance rather than multiple choice
 *
 * Used for quizzes where:
 * - The correct answer is obvious (e.g., longest answer)
 * - Correct answers start with "Demonstrate..."
 * - Wrong answers are short negatives
 *
 * Layout:
 * - Interview Question (prominent)
 * - What to Demonstrate (correct answer)
 * - Common Mistakes to Avoid (wrong answers as bullets)
 * - Tip (explanation)
 */
export function ReflectionItem({
  block,
  onComplete,
  className,
}: ReflectionItemProps) {
  const { question, options, explanation } = block;

  // Separate correct and incorrect answers
  const correctAnswer = options.find((o) => o.isCorrect);
  const incorrectAnswers = options.filter((o) => !o.isCorrect);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[50vh]",
        "px-3 sm:px-4 py-6 sm:py-8",
        className
      )}
    >
      <div className="w-full max-w-2xl space-y-4 sm:space-y-5">
        {/* Interview Question */}
        <div
          className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-5"
          role="region"
          aria-label="Interview question"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-600 shrink-0">
              <ThoughtBubbleIcon />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-blue-700 uppercase tracking-wide">
                Interview Question
              </span>
              <p className="mt-1.5 text-base sm:text-lg text-blue-900 leading-relaxed font-medium">
                &ldquo;{question}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* What to Demonstrate */}
        {correctAnswer && (
          <div
            className="bg-green-50 border-2 border-green-200 rounded-xl p-4 sm:p-5"
            role="region"
            aria-label="What to demonstrate"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-100 text-green-600 shrink-0">
                <CheckCircleIcon />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-green-700 uppercase tracking-wide">
                  What to Demonstrate
                </span>
                <p className="mt-1.5 text-base sm:text-lg text-green-900 leading-relaxed">
                  {correctAnswer.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Common Mistakes to Avoid */}
        {incorrectAnswers.length > 0 && (
          <div
            className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 sm:p-5"
            role="region"
            aria-label="Common mistakes to avoid"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 text-amber-600 shrink-0">
                <WarningTriangleIcon />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-amber-700 uppercase tracking-wide">
                  Common Mistakes to Avoid
                </span>
                <ul className="mt-2 space-y-1.5">
                  {incorrectAnswers.map((answer) => (
                    <li
                      key={answer.id}
                      className="flex items-start gap-2 text-sm sm:text-base text-amber-900"
                    >
                      <span
                        className="text-amber-500 shrink-0 mt-0.5"
                        aria-hidden="true"
                      >
                        &bull;
                      </span>
                      <span>{answer.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tip / Explanation */}
        {explanation && (
          <div
            className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 sm:p-5"
            role="note"
            aria-label="Tip"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 shrink-0">
                <LightbulbIcon />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-purple-700 uppercase tracking-wide">
                  Tip
                </span>
                <p className="mt-1.5 text-sm sm:text-base text-purple-900 leading-relaxed">
                  {explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <button
          type="button"
          onClick={onComplete}
          className={cn(
            "w-full py-3 sm:py-4 px-5 sm:px-6 rounded-xl font-semibold text-base sm:text-lg",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            "min-h-[48px] sm:min-h-[56px]",
            "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
