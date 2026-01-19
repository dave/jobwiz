"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Avatar } from "../Avatar";
import { ChatBubble } from "../ChatBubble";
import { useConversation } from "../ConversationContext";
import type { QuizBlock, QuizOption } from "@/types";

export interface ConversationalQuizProps {
  /** The quiz item ID */
  itemId: string;
  /** The quiz content block */
  quiz: QuizBlock;
  /** Callback when the quiz is completed (answered + feedback shown) */
  onComplete?: () => void;
  /** Delay before auto-advance after feedback (ms, default 1500) */
  autoAdvanceDelay?: number;
  /** Optional custom class name */
  className?: string;
}

/** State for the quiz flow */
type QuizState = "question" | "answered" | "feedback";

/**
 * ConversationalQuiz - Quiz question in conversation flow.
 *
 * Flow:
 * 1. Alex asks question (chat bubble)
 * 2. Options fade in staggered (50ms apart)
 * 3. User taps option -> immediate highlight
 * 4. User's answer appears as pill (slides in from right)
 * 5. Alex feedback bubble appears (250ms delay)
 * 6. Auto-advance after 1.5s (or tap to skip)
 */
export function ConversationalQuiz({
  itemId,
  quiz,
  onComplete,
  autoAdvanceDelay = 1500,
  className = "",
}: ConversationalQuizProps) {
  const prefersReducedMotion = useReducedMotion();
  const { addMessage, recordAnswer, getAnswer, hasAnswer } = useConversation();

  // Check if already answered
  const existingAnswer = getAnswer(itemId);
  const wasAlreadyAnswered = hasAnswer(itemId);

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>(() =>
    wasAlreadyAnswered ? "feedback" : "question"
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    () => existingAnswer?.selectedIds[0] ?? null
  );
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(
    () => existingAnswer?.isCorrect
  );

  // Track if we've added messages for this question
  const messagesAddedRef = useRef(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get the selected option details
  const selectedOption = quiz.options.find((o) => o.id === selectedOptionId);

  // Find the correct answer
  const correctOption = quiz.options.find((o) => o.isCorrect);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Add initial question message on mount (only once)
  useEffect(() => {
    if (!messagesAddedRef.current && !wasAlreadyAnswered) {
      addMessage("alex", quiz.question, itemId);
      messagesAddedRef.current = true;
    }
  }, [addMessage, itemId, quiz.question, wasAlreadyAnswered]);

  // Handle option selection
  const handleSelectOption = useCallback(
    (option: QuizOption) => {
      if (quizState !== "question") return;

      setSelectedOptionId(option.id);
      setIsCorrect(option.isCorrect);
      setQuizState("answered");

      // Add user's answer as message
      addMessage("user", option.text, itemId);

      // Record the answer in context
      recordAnswer(itemId, [option.id], option.isCorrect);

      // Delay before showing feedback
      const feedbackDelay = prefersReducedMotion ? 0 : 250;
      setTimeout(() => {
        setQuizState("feedback");

        // Add feedback message
        const feedbackText = option.isCorrect
          ? quiz.explanation || "That's correct!"
          : `Not quite. ${quiz.explanation || `The correct answer is: ${correctOption?.text ?? "N/A"}`}`;
        addMessage("alex", feedbackText, itemId);

        // Start auto-advance timer
        if (autoAdvanceDelay > 0) {
          autoAdvanceTimerRef.current = setTimeout(() => {
            onComplete?.();
          }, autoAdvanceDelay);
        }
      }, feedbackDelay);
    },
    [
      quizState,
      addMessage,
      itemId,
      recordAnswer,
      prefersReducedMotion,
      quiz.explanation,
      correctOption?.text,
      autoAdvanceDelay,
      onComplete,
    ]
  );

  // Handle skip (tap to continue during feedback)
  const handleSkip = useCallback(() => {
    if (quizState === "feedback") {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      onComplete?.();
    }
  }, [quizState, onComplete]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (quizState === "feedback" && event.key === "Enter") {
        handleSkip();
      }
    },
    [quizState, handleSkip]
  );

  // Animation variants for options (staggered fade-in)
  const optionContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
      },
    },
  };

  const optionVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.25,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  // Determine option state for styling
  const getOptionState = (option: QuizOption): "default" | "selected" | "correct" | "incorrect" => {
    if (quizState === "question") return "default";
    if (quizState === "answered" || quizState === "feedback") {
      if (option.id === selectedOptionId) {
        return option.isCorrect ? "correct" : "incorrect";
      }
      // Show correct answer after selection
      if (quizState === "feedback" && option.isCorrect && !isCorrect) {
        return "correct";
      }
    }
    return "default";
  };

  return (
    <div
      className={`conversational-quiz ${className}`.trim()}
      style={containerStyle}
      data-testid={`quiz-${itemId}`}
      onKeyDown={handleKeyDown}
      role="group"
      aria-labelledby={`quiz-question-${itemId}`}
    >
      {/* Question bubble (only shown if not already answered and messages not yet rendered) */}
      {!wasAlreadyAnswered && (
        <div style={questionSectionStyle}>
          <div style={avatarContainerStyle}>
            <Avatar size="small" />
          </div>
          <ChatBubble variant="alex" animate={!messagesAddedRef.current}>
            <span id={`quiz-question-${itemId}`} style={questionTextStyle}>
              {quiz.question}
            </span>
          </ChatBubble>
        </div>
      )}

      {/* Options */}
      <motion.div
        style={optionsContainerStyle}
        variants={optionContainerVariants}
        initial="hidden"
        animate="visible"
        data-testid={`quiz-options-${itemId}`}
        role="radiogroup"
        aria-label="Quiz options"
      >
        <AnimatePresence>
          {quiz.options.map((option) => {
            const optionState = getOptionState(option);
            const isDisabled = quizState !== "question";

            return (
              <motion.button
                key={option.id}
                variants={optionVariants}
                onClick={() => handleSelectOption(option)}
                disabled={isDisabled}
                style={{
                  ...optionButtonStyle,
                  ...getOptionStateStyle(optionState),
                  cursor: isDisabled ? "default" : "pointer",
                }}
                data-testid={`quiz-option-${option.id}`}
                data-state={optionState}
                role="radio"
                aria-checked={option.id === selectedOptionId}
                aria-disabled={isDisabled}
              >
                {option.text}
                {optionState === "correct" && (
                  <span style={iconStyle} aria-hidden="true">
                    ✓
                  </span>
                )}
                {optionState === "incorrect" && (
                  <span style={iconStyle} aria-hidden="true">
                    ✗
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* User answer pill (shown after selection) */}
      <AnimatePresence>
        {selectedOption && (quizState === "answered" || quizState === "feedback") && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
            style={userAnswerContainerStyle}
            data-testid={`quiz-user-answer-${itemId}`}
          >
            <ChatBubble variant="user" animate={false}>
              {selectedOption.text}
            </ChatBubble>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback bubble (shown after delay) */}
      <AnimatePresence>
        {quizState === "feedback" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
            style={feedbackSectionStyle}
            data-testid={`quiz-feedback-${itemId}`}
          >
            <div style={avatarContainerStyle}>
              <Avatar size="small" />
            </div>
            <ChatBubble
              variant="alex"
              animate={!prefersReducedMotion}
              className={isCorrect ? "feedback-correct" : "feedback-incorrect"}
            >
              <span
                style={{
                  ...feedbackTextStyle,
                  color: isCorrect ? "var(--success-text, #166534)" : "var(--foreground)",
                }}
              >
                {isCorrect
                  ? quiz.explanation || "That's correct!"
                  : `Not quite. ${quiz.explanation || `The correct answer is: ${correctOption?.text ?? "N/A"}`}`}
              </span>
            </ChatBubble>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button (shown during feedback) */}
      <AnimatePresence>
        {quizState === "feedback" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.25,
              delay: prefersReducedMotion ? 0 : 0.15,
            }}
            onClick={handleSkip}
            style={continueButtonStyle}
            data-testid={`quiz-continue-${itemId}`}
            aria-label="Continue to next question"
          >
            Continue
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  width: "100%",
};

const questionSectionStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  alignItems: "flex-start",
};

const avatarContainerStyle: React.CSSProperties = {
  flexShrink: 0,
};

const questionTextStyle: React.CSSProperties = {
  fontSize: "var(--text-base)",
  lineHeight: 1.6,
};

const optionsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  marginLeft: "calc(var(--avatar-sm) + var(--space-3))",
};

const optionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "48px",
  padding: "12px 16px",
  border: "2px solid transparent",
  borderRadius: "12px",
  backgroundColor: "var(--surface-elevated)",
  fontSize: "var(--text-base)",
  textAlign: "left",
  width: "100%",
  transition: "border-color 0.15s ease, background-color 0.15s ease",
};

const getOptionStateStyle = (
  state: "default" | "selected" | "correct" | "incorrect"
): React.CSSProperties => {
  switch (state) {
    case "correct":
      return {
        borderColor: "#22c55e",
        backgroundColor: "var(--success-soft)",
      };
    case "incorrect":
      return {
        borderColor: "#ef4444",
        backgroundColor: "#fef2f2",
      };
    case "selected":
      return {
        borderColor: "var(--primary)",
      };
    default:
      return {};
  }
};

const iconStyle: React.CSSProperties = {
  fontSize: "var(--text-lg)",
  fontWeight: 600,
  marginLeft: "var(--space-2)",
};

const userAnswerContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const feedbackSectionStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  alignItems: "flex-start",
};

const feedbackTextStyle: React.CSSProperties = {
  fontSize: "var(--text-base)",
  lineHeight: 1.6,
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

export default ConversationalQuiz;
