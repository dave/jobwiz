"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChecklistBlock as ChecklistBlockType, ChecklistItem } from "@/types/module";
import type { BlockBaseProps } from "./types";

type ChecklistBlockProps = BlockBaseProps & {
  block: ChecklistBlockType;
  /** localStorage key for persistence. Defaults to block.id */
  storageKey?: string;
};

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export function ChecklistBlock({ block, onComplete, storageKey }: ChecklistBlockProps) {
  const { title, items } = block;
  const key = storageKey ?? `checklist-${block.id}`;
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setCheckedIds(new Set(parsed));
      }
    } catch (e) {
      console.error("Failed to load checklist state:", e);
    }
  }, [key]);

  // Save to localStorage when checkedIds changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...checkedIds]));
    } catch (e) {
      console.error("Failed to save checklist state:", e);
    }
  }, [checkedIds, key]);

  // Calculate which items are required
  const requiredIds = useMemo(
    () => new Set(items.filter((item) => item.required !== false).map((item) => item.id)),
    [items]
  );

  // Check if all required items are checked
  const allRequiredChecked = useMemo(() => {
    return [...requiredIds].every((id) => checkedIds.has(id));
  }, [requiredIds, checkedIds]);

  // Call onComplete when all required items are checked (only once)
  useEffect(() => {
    if (allRequiredChecked && !hasCalledComplete) {
      setHasCalledComplete(true);
      onComplete?.();
    }
  }, [allRequiredChecked, hasCalledComplete, onComplete]);

  const toggleItem = useCallback((itemId: string) => {
    setCheckedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const completedCount = checkedIds.size;
  const totalCount = items.length;

  return (
    <div className="space-y-3">
      {/* Title */}
      {title && <h4 className="font-medium text-gray-900">{title}</h4>}

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="tabular-nums">
          {completedCount} of {totalCount} complete
        </span>
        {allRequiredChecked && (
          <span className="text-green-600 font-medium">(All required items done!)</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label={`${completedCount} of ${totalCount} items completed`}
        />
      </div>

      {/* Checklist items */}
      <ul className="space-y-2" role="list">
        {items.map((item) => {
          const isChecked = checkedIds.has(item.id);
          const isRequired = item.required !== false;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg",
                  "text-left transition-colors duration-200",
                  "hover:bg-gray-50",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                )}
                role="checkbox"
                aria-checked={isChecked}
              >
                {/* Checkbox */}
                <span
                  className={cn(
                    "flex items-center justify-center shrink-0",
                    "w-5 h-5 rounded border-2",
                    "transition-colors duration-200",
                    isChecked
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-gray-300"
                  )}
                >
                  {isChecked && <CheckIcon />}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    "flex-1 text-gray-900",
                    "transition-colors duration-200",
                    isChecked && "line-through text-gray-400"
                  )}
                >
                  {item.text}
                  {isRequired && !isChecked && (
                    <span className="ml-1 text-red-500 text-sm">*</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
