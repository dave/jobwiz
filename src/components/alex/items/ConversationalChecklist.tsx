"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Avatar } from "../Avatar";
import { ChatBubble } from "../ChatBubble";
import { useConversation } from "../ConversationContext";
import type { ChecklistBlock, ChecklistItem as ChecklistItemType } from "@/types";

export interface ConversationalChecklistProps {
  /** The checklist item ID */
  itemId: string;
  /** The checklist block to render */
  checklist: ChecklistBlock;
  /** Callback when the checklist is completed (all required items checked) */
  onComplete?: () => void;
  /** Optional custom class name */
  className?: string;
}

/** Check icon SVG */
const CheckIcon = () => (
  <svg
    className="check-icon"
    style={checkIconStyle}
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

/**
 * ConversationalChecklist - Checklist in conversation flow.
 *
 * Flow:
 * 1. Alex introduces checklist (chat bubble)
 * 2. Items appear one-by-one with staggered animation
 * 3. Checked items animate completion
 * 4. "Continue when ready" after all required checked
 */
export function ConversationalChecklist({
  itemId,
  checklist,
  onComplete,
  className = "",
}: ConversationalChecklistProps) {
  const prefersReducedMotion = useReducedMotion();
  const { addMessage, recordAnswer, getAnswer, hasAnswer } = useConversation();

  // Check if already answered
  const existingAnswer = getAnswer(itemId);
  const wasAlreadyAnswered = hasAnswer(itemId);

  // Track checked items
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    // Restore from existing answer if available
    if (existingAnswer?.selectedIds) {
      return new Set(existingAnswer.selectedIds);
    }
    return new Set();
  });

  // Track which items are visible (for staggered animation)
  const [visibleItemCount, setVisibleItemCount] = useState(() => {
    // Show all items immediately if already answered or reduced motion
    if (wasAlreadyAnswered || prefersReducedMotion) {
      return checklist.items.length;
    }
    return 0;
  });

  // Track if we've added the intro message
  const messagesAddedRef = useRef(false);

  // Get required items
  const requiredItems = checklist.items.filter((item) => item.required !== false);
  const allRequiredChecked = requiredItems.every((item) => checkedItems.has(item.id));

  // Add intro message on mount (only once)
  useEffect(() => {
    if (!messagesAddedRef.current) {
      const introMessage = checklist.title || "Here's a checklist to complete:";
      addMessage("alex", introMessage, itemId);
      messagesAddedRef.current = true;
    }
  }, [addMessage, itemId, checklist.title]);

  // Animate items appearing one by one
  useEffect(() => {
    if (wasAlreadyAnswered || prefersReducedMotion) return;
    if (visibleItemCount >= checklist.items.length) return;

    const timer = setTimeout(() => {
      setVisibleItemCount((prev) => prev + 1);
    }, 150); // 150ms between each item

    return () => clearTimeout(timer);
  }, [visibleItemCount, checklist.items.length, wasAlreadyAnswered, prefersReducedMotion]);

  // Handle item toggle
  const handleToggle = useCallback(
    (item: ChecklistItemType) => {
      setCheckedItems((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }

        // Record the answer in context
        recordAnswer(itemId, Array.from(next));

        return next;
      });
    },
    [itemId, recordAnswer]
  );

  // Handle continue button click
  const handleContinue = useCallback(() => {
    if (allRequiredChecked) {
      onComplete?.();
    }
  }, [allRequiredChecked, onComplete]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (allRequiredChecked && event.key === "Enter") {
        handleContinue();
      }
    },
    [allRequiredChecked, handleContinue]
  );

  // Animation variants for items (staggered fade-in)
  const itemContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.25,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  // Check animation variants
  const checkVariants = {
    unchecked: { scale: 1 },
    checked: {
      scale: [1, 1.2, 1],
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <div
      className={`conversational-checklist ${className}`.trim()}
      style={containerStyle}
      data-testid={`checklist-${itemId}`}
      onKeyDown={handleKeyDown}
      role="group"
      aria-labelledby={`checklist-title-${itemId}`}
    >
      {/* Intro bubble */}
      <div style={introSectionStyle}>
        <div style={avatarContainerStyle}>
          <Avatar size="small" />
        </div>
        <ChatBubble variant="alex" animate={!wasAlreadyAnswered}>
          <span id={`checklist-title-${itemId}`} style={titleTextStyle}>
            {checklist.title || "Here's a checklist to complete:"}
          </span>
        </ChatBubble>
      </div>

      {/* Checklist items */}
      <motion.div
        style={itemsContainerStyle}
        variants={itemContainerVariants}
        initial="hidden"
        animate="visible"
        data-testid={`checklist-items-${itemId}`}
        role="group"
        aria-label="Checklist items"
      >
        <AnimatePresence>
          {checklist.items.slice(0, visibleItemCount).map((item) => {
            const isChecked = checkedItems.has(item.id);
            const isRequired = item.required !== false;

            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                style={itemWrapperStyle}
                data-testid={`checklist-item-${item.id}`}
              >
                <label style={itemLabelStyle}>
                  <motion.div
                    style={{
                      ...checkboxContainerStyle,
                      ...(isChecked ? checkedCheckboxStyle : uncheckedCheckboxStyle),
                    }}
                    variants={checkVariants}
                    animate={isChecked ? "checked" : "unchecked"}
                    data-testid={`checklist-checkbox-${item.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(item)}
                      style={hiddenInputStyle}
                      aria-describedby={`checklist-item-text-${item.id}`}
                    />
                    {isChecked && <CheckIcon />}
                  </motion.div>
                  <span
                    id={`checklist-item-text-${item.id}`}
                    style={{
                      ...itemTextStyle,
                      ...(isChecked ? checkedTextStyle : {}),
                    }}
                  >
                    {item.text}
                    {!isRequired && (
                      <span style={optionalLabelStyle} data-testid={`checklist-optional-${item.id}`}>
                        (optional)
                      </span>
                    )}
                  </span>
                </label>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Progress indicator */}
      {requiredItems.length > 0 && visibleItemCount === checklist.items.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.25, delay: prefersReducedMotion ? 0 : 0.2 }}
          style={progressContainerStyle}
          data-testid={`checklist-progress-${itemId}`}
          role="status"
          aria-live="polite"
        >
          {allRequiredChecked ? (
            <span style={progressCompleteStyle}>
              <CheckIcon /> All required items complete
            </span>
          ) : (
            <span style={progressTextStyle}>
              {checkedItems.size} of {requiredItems.length} required items checked
            </span>
          )}
        </motion.div>
      )}

      {/* Continue button (shown when all required checked) */}
      <AnimatePresence>
        {allRequiredChecked && visibleItemCount === checklist.items.length && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.25,
              delay: prefersReducedMotion ? 0 : 0.15,
            }}
            onClick={handleContinue}
            style={continueButtonStyle}
            data-testid={`checklist-continue-${itemId}`}
            aria-label="Continue to next"
          >
            Continue
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===========================
// Styles
// ===========================

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  width: "100%",
};

const introSectionStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  alignItems: "flex-start",
};

const avatarContainerStyle: React.CSSProperties = {
  flexShrink: 0,
};

const titleTextStyle: React.CSSProperties = {
  fontSize: "var(--text-base)",
  lineHeight: 1.6,
};

const itemsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  marginLeft: "calc(var(--avatar-sm) + var(--space-3))",
};

const itemWrapperStyle: React.CSSProperties = {
  width: "100%",
};

const itemLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-3)",
  padding: "12px 16px",
  backgroundColor: "var(--surface-elevated, #f8fafc)",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  minHeight: "48px",
};

const checkboxContainerStyle: React.CSSProperties = {
  flexShrink: 0,
  width: "24px",
  height: "24px",
  borderRadius: "6px",
  border: "2px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "border-color 0.15s ease, background-color 0.15s ease",
  marginTop: "2px",
};

const uncheckedCheckboxStyle: React.CSSProperties = {
  borderColor: "var(--border, #d1d5db)",
  backgroundColor: "white",
};

const checkedCheckboxStyle: React.CSSProperties = {
  borderColor: "#22c55e",
  backgroundColor: "#22c55e",
  color: "white",
};

const hiddenInputStyle: React.CSSProperties = {
  position: "absolute",
  opacity: 0,
  width: 0,
  height: 0,
};

const checkIconStyle: React.CSSProperties = {
  width: "16px",
  height: "16px",
};

const itemTextStyle: React.CSSProperties = {
  fontSize: "var(--text-base)",
  lineHeight: 1.5,
  color: "var(--foreground)",
  flex: 1,
};

const checkedTextStyle: React.CSSProperties = {
  textDecoration: "line-through",
  opacity: 0.7,
};

const optionalLabelStyle: React.CSSProperties = {
  marginLeft: "var(--space-2)",
  fontSize: "var(--text-sm, 14px)",
  color: "var(--text-muted, #6b7280)",
  fontWeight: 500,
};

const progressContainerStyle: React.CSSProperties = {
  marginLeft: "calc(var(--avatar-sm) + var(--space-3))",
  padding: "var(--space-2) 0",
};

const progressTextStyle: React.CSSProperties = {
  fontSize: "var(--text-sm, 14px)",
  color: "var(--text-muted, #6b7280)",
};

const progressCompleteStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  fontSize: "var(--text-sm, 14px)",
  color: "#166534",
  fontWeight: 500,
};

const continueButtonStyle: React.CSSProperties = {
  alignSelf: "center",
  minHeight: "var(--button-h)",
  padding: "12px 32px",
  backgroundColor: "var(--primary)",
  color: "white",
  border: "none",
  borderRadius: "9999px",
  fontSize: "var(--text-base)",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "var(--space-2)",
};

export default ConversationalChecklist;
