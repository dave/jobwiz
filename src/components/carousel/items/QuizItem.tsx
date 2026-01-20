"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { QuizBlock, QuizOption } from "@/types/module";
import { ReflectionItem } from "./ReflectionItem";

export interface QuizItemProps {
  /** The quiz block to render */
  block: QuizBlock;
  /** Called when an answer is submitted - used to advance to next item */
  onComplete?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Detects if a quiz should be rendered as a reflection/guidance format.
 *
 * Reflection quizzes have:
 * - A correct answer starting with "Demonstrate"
 * - The correct answer is significantly longer than wrong answers
 *
 * These are "behavioral interview question" quizzes where the "correct answer"
 * is really guidance on what to demonstrate, not a trivia answer.
 */
export function isReflectionQuiz(block: QuizBlock): boolean {
  const correctOption = block.options.find((o) => o.isCorrect);
  const wrongOptions = block.options.filter((o) => !o.isCorrect);

  if (!correctOption || wrongOptions.length === 0) return false;

  // Check if correct answer starts with "Demonstrate"
  const startsWithDemonstrate = correctOption.text
    .toLowerCase()
    .trim()
    .startsWith("demonstrate");

  if (!startsWithDemonstrate) return false;

  // Check if correct answer is significantly longer than average wrong answer
  const avgWrongLength =
    wrongOptions.reduce((sum, o) => sum + o.text.length, 0) / wrongOptions.length;
  const isLonger = correctOption.text.length > avgWrongLength * 1.5;

  return isLonger;
}

const CheckIcon = () => (
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
      strokeWidth={2.5}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const XIcon = () => (
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
      strokeWidth={2.5}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

/**
 * QuizItem - Carousel-optimized quiz component
 *
 * Features:
 * - Clean Q+A layout with large typography
 * - Submit automatically advances to next item
 * - Clear correct/incorrect feedback
 * - Centered, minimal UI design
 * - Automatically delegates to ReflectionItem for "Demonstrate..." style quizzes
 */
export function QuizItem({ block, onComplete, className }: QuizItemProps) {
  // Check if this should be rendered as a reflection quiz
  if (isReflectionQuiz(block)) {
    return (
      <ReflectionItem block={block} onComplete={onComplete} className={className} />
    );
  }

  return <QuizItemInteractive block={block} onComplete={onComplete} className={className} />;
}

/**
 * Internal component for interactive quiz rendering.
 * Separated to allow early return for reflection quizzes while maintaining hooks rules.
 */
function QuizItemInteractive({ block, onComplete, className }: QuizItemProps) {
  const { question, options, multiSelect = false, explanation } = block;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);

  const correctIds = new Set(
    options.filter((o) => o.isCorrect).map((o) => o.id)
  );

  const isCorrect =
    selectedIds.size === correctIds.size &&
    [...selectedIds].every((id) => correctIds.has(id));

  const handleOptionClick = useCallback(
    (optionId: string) => {
      if (isSubmitted) return;

      setSelectedIds((prev) => {
        const newSet = new Set(prev);

        if (multiSelect) {
          if (newSet.has(optionId)) {
            newSet.delete(optionId);
          } else {
            newSet.add(optionId);
          }
        } else {
          newSet.clear();
          newSet.add(optionId);
        }

        return newSet;
      });
    },
    [isSubmitted, multiSelect]
  );

  const handleSubmit = useCallback(() => {
    if (selectedIds.size === 0 || isSubmitted) return;
    setIsSubmitted(true);
    // Mark as complete when answer is submitted
    onComplete?.();
  }, [selectedIds.size, isSubmitted, onComplete]);


  const getOptionState = (option: QuizOption) => {
    if (!isSubmitted) {
      return selectedIds.has(option.id) ? "selected" : "default";
    }

    if (option.isCorrect) {
      return "correct";
    }

    if (selectedIds.has(option.id) && !option.isCorrect) {
      return "incorrect";
    }

    return "default";
  };

  const getOptionClasses = (state: string) => {
    const base = cn(
      "w-full p-4 sm:p-5 rounded-xl border-2 text-left",
      "transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
      "min-h-[56px] sm:min-h-[64px]"
    );

    switch (state) {
      case "selected":
        return cn(
          base,
          "border-blue-500 bg-blue-50 text-blue-900",
          "shadow-md"
        );
      case "correct":
        return cn(
          base,
          "border-green-500 bg-green-50 text-green-900",
          "shadow-md"
        );
      case "incorrect":
        return cn(
          base,
          "border-red-500 bg-red-50 text-red-900",
          "shadow-md"
        );
      default:
        return cn(
          base,
          "border-gray-200 bg-white text-gray-800",
          "hover:border-gray-300 hover:bg-gray-50",
          isSubmitted && "opacity-50"
        );
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[50vh]",
        "px-3 sm:px-4 py-6 sm:py-8",
        className
      )}
    >
      <div className="w-full max-w-2xl space-y-5 sm:space-y-8">
        {/* Question */}
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center leading-relaxed">
          {question}
        </h2>

        {/* Options */}
        <div className="space-y-2.5 sm:space-y-3" role="group" aria-label="Quiz options">
          {options.map((option, index) => {
            const state = getOptionState(option);
            const isSelected = selectedIds.has(option.id);
            const letter = String.fromCharCode(65 + index); // A, B, C, D...

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOptionClick(option.id)}
                className={getOptionClasses(state)}
                disabled={isSubmitted}
                role={multiSelect ? "checkbox" : "radio"}
                aria-checked={isSelected}
                aria-disabled={isSubmitted}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Letter indicator */}
                  <span
                    className={cn(
                      "flex items-center justify-center shrink-0",
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-semibold text-base sm:text-lg",
                      state === "selected" &&
                        "bg-blue-500 text-white",
                      state === "correct" &&
                        "bg-green-500 text-white",
                      state === "incorrect" &&
                        "bg-red-500 text-white",
                      state === "default" &&
                        "bg-gray-100 text-gray-600"
                    )}
                  >
                    {state === "correct" ? (
                      <CheckIcon />
                    ) : state === "incorrect" ? (
                      <XIcon />
                    ) : (
                      letter
                    )}
                  </span>

                  {/* Option text */}
                  <span className="flex-1 text-base sm:text-lg">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button / Result */}
        {!isSubmitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedIds.size === 0}
            className={cn(
              "w-full py-3 sm:py-4 px-5 sm:px-6 rounded-xl font-semibold text-base sm:text-lg",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "min-h-[48px] sm:min-h-[56px]",
              selectedIds.size === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
            )}
          >
            Check Answer
          </button>
        ) : (
          /* Result feedback */
          <div
            className={cn(
              "p-4 sm:p-6 rounded-xl text-center",
              isCorrect
                ? "bg-green-50 border-2 border-green-200"
                : "bg-red-50 border-2 border-red-200"
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span
                className={cn(
                  "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full",
                  isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                )}
              >
                {isCorrect ? <CheckIcon /> : <XIcon />}
              </span>
              <span
                className={cn(
                  "text-lg sm:text-xl font-semibold",
                  isCorrect ? "text-green-800" : "text-red-800"
                )}
              >
                {isCorrect ? "Correct!" : "Not quite"}
              </span>
            </div>

            {/* Explanation */}
            {explanation && (
              <p
                className={cn(
                  "text-base sm:text-lg leading-relaxed",
                  isCorrect ? "text-green-700" : "text-red-700"
                )}
              >
                {explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
