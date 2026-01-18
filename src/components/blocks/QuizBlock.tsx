"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { QuizBlock as QuizBlockType, QuizOption } from "@/types/module";
import type { BlockBaseProps } from "./types";

type QuizBlockProps = BlockBaseProps & {
  block: QuizBlockType;
};

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function QuizBlock({ block, onComplete }: QuizBlockProps) {
  const { question, options, multiSelect = false, explanation } = block;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);

  const correctIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));

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
    if (selectedIds.size === 0) return;
    setIsSubmitted(true);
    onComplete?.();
  }, [selectedIds.size, onComplete]);

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
      "w-full p-4 rounded-lg border-2 text-left",
      "transition-colors duration-200",
      "focus:outline-none focus:ring-2 focus:ring-offset-2"
    );

    switch (state) {
      case "selected":
        return cn(base, "border-indigo-500 bg-indigo-50 focus:ring-indigo-500");
      case "correct":
        return cn(base, "border-green-500 bg-green-50 text-green-900");
      case "incorrect":
        return cn(base, "border-red-500 bg-red-50 text-red-900");
      default:
        return cn(
          base,
          "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
          "focus:ring-indigo-500",
          isSubmitted && "opacity-60"
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Question */}
      <h3 className="text-lg font-medium text-gray-900">{question}</h3>

      {/* Options */}
      <div className="space-y-2" role="group" aria-label="Quiz options">
        {options.map((option) => {
          const state = getOptionState(option);
          const isSelected = selectedIds.has(option.id);

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
              <div className="flex items-center gap-3">
                {/* Selection indicator */}
                <span
                  className={cn(
                    "flex items-center justify-center shrink-0",
                    "w-6 h-6 rounded-full border-2",
                    state === "selected" && "border-indigo-500 bg-indigo-500 text-white",
                    state === "correct" && "border-green-500 bg-green-500 text-white",
                    state === "incorrect" && "border-red-500 bg-red-500 text-white",
                    state === "default" && "border-gray-300"
                  )}
                >
                  {state === "correct" && <CheckIcon />}
                  {state === "incorrect" && <XIcon />}
                  {state === "selected" && <span className="w-2 h-2 bg-white rounded-full" />}
                </span>

                {/* Option text */}
                <span className="flex-1">{option.text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Submit button / Result */}
      {!isSubmitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedIds.size === 0}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-medium",
            "transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
            selectedIds.size === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          )}
        >
          Submit Answer
        </button>
      ) : (
        <div
          className={cn(
            "p-4 rounded-lg",
            isCorrect
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full",
                isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
              )}
            >
              {isCorrect ? <CheckIcon /> : <XIcon />}
            </span>
            <span className={cn("font-medium", isCorrect ? "text-green-800" : "text-red-800")}>
              {isCorrect ? "Correct!" : "Incorrect"}
            </span>
          </div>

          {/* Explanation */}
          {explanation && (
            <p className={cn("text-sm", isCorrect ? "text-green-700" : "text-red-700")}>
              {explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
