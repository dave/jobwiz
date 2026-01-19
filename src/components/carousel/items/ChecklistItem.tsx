"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ChecklistBlock, ChecklistItem as ChecklistItemType } from "@/types/module";

export interface ChecklistItemProps {
  /** The checklist block to render */
  block: ChecklistBlock;
  /** Called when all required items are checked */
  onComplete?: () => void;
  /** Custom class name */
  className?: string;
}

const CheckIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
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

const ClipboardIcon = () => (
  <svg
    className="h-8 w-8 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

/**
 * ChecklistItem - Carousel-optimized checklist block renderer
 *
 * Renders a checklist with checkable items, tracking completion state.
 * Required items must be checked before the block is considered complete.
 */
export function ChecklistItem({ block, onComplete, className }: ChecklistItemProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Get required items
  const requiredItems = block.items.filter((item) => item.required !== false);
  const allRequiredChecked = requiredItems.every((item) => checkedItems.has(item.id));

  // Handle item toggle
  const handleToggle = useCallback((itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Note: Checklists don't auto-advance - user must click Next manually

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[50vh]",
        "px-4 py-8",
        className
      )}
    >
      <div
        className={cn(
          "w-full max-w-2xl",
          "bg-blue-50 border-2 border-blue-200 rounded-2xl",
          "p-8 sm:p-10"
        )}
        role="group"
        aria-label={block.title || "Checklist"}
      >
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 text-blue-600">
            <ClipboardIcon />
          </div>
          <div className="flex-1">
            {block.title && (
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                {block.title}
              </h3>
            )}
            <ul className="space-y-3">
              {block.items.map((item) => (
                <li key={item.id}>
                  <label
                    className={cn(
                      "flex items-start gap-3 cursor-pointer group",
                      "p-3 rounded-lg transition-colors",
                      checkedItems.has(item.id)
                        ? "bg-blue-100"
                        : "hover:bg-blue-100/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-6 h-6 mt-0.5 rounded border-2 transition-colors",
                        "flex items-center justify-center",
                        checkedItems.has(item.id)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-blue-300 bg-white group-hover:border-blue-400"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checkedItems.has(item.id)}
                        onChange={() => handleToggle(item.id)}
                        className="sr-only"
                        aria-describedby={`item-${item.id}-text`}
                      />
                      {checkedItems.has(item.id) && <CheckIcon />}
                    </div>
                    <span
                      id={`item-${item.id}-text`}
                      className={cn(
                        "text-lg text-blue-900 leading-relaxed",
                        checkedItems.has(item.id) && "line-through opacity-70"
                      )}
                    >
                      {item.text}
                      {item.required === false && (
                        <span className="ml-2 text-sm text-blue-500 font-medium">
                          (optional)
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {requiredItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-blue-700">
                  {allRequiredChecked ? (
                    <span className="flex items-center gap-2">
                      <CheckIcon />
                      All required items complete
                    </span>
                  ) : (
                    `${checkedItems.size} of ${requiredItems.length} required items checked`
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
