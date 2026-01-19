"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Avatar } from "../Avatar";
import { ChatBubble } from "../ChatBubble";
import { TypingIndicator } from "../TypingIndicator";
import { useConversation } from "../ConversationContext";
import type { TextBlock, QuoteBlock, TipBlock, WarningBlock } from "@/types";

/** Content types supported by this component */
export type ConversationalContentType = "text" | "quote" | "tip" | "warning";

/** Union of supported content block types */
export type ConversationalContentBlock =
  | TextBlock
  | QuoteBlock
  | TipBlock
  | WarningBlock;

export interface ConversationalContentProps {
  /** The content item ID */
  itemId: string;
  /** The content block to render */
  content: ConversationalContentBlock;
  /** Callback when the content is completed (after typing and delay) */
  onComplete?: () => void;
  /** Whether to auto-advance after showing content */
  autoAdvance?: boolean;
  /** Delay before auto-advance (ms, default 2000) */
  autoAdvanceDelay?: number;
  /** Minimum character count to show typing indicator (default 50) */
  typingThreshold?: number;
  /** Optional custom class name */
  className?: string;
}

/** Typing animation speed in ms per character */
const TYPING_SPEED_MS = 30;

/** Minimum typing duration (ms) */
const MIN_TYPING_DURATION = 500;

/** Maximum typing duration (ms) */
const MAX_TYPING_DURATION = 2000;

/**
 * ConversationalContent - Text content as Alex chat bubble.
 *
 * Renders text, quote, tip, and warning blocks as conversation messages
 * from the coach "Alex".
 *
 * Features:
 * - Content appears as Alex's message bubble
 * - Optional typing animation (if >50 chars)
 * - Respects reduced-motion preference
 * - Auto-advance or tap-to-continue based on length
 */
export function ConversationalContent({
  itemId,
  content,
  onComplete,
  autoAdvance = true,
  autoAdvanceDelay = 2000,
  typingThreshold = 50,
  className = "",
}: ConversationalContentProps) {
  const prefersReducedMotion = useReducedMotion();
  const { addMessage } = useConversation();

  // State for typing animation
  const [isTyping, setIsTyping] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Track if we've processed this content
  const processedRef = useRef(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get the text content
  const textContent = content.content;
  const shouldShowTyping =
    !prefersReducedMotion && textContent.length > typingThreshold;

  // Calculate typing duration based on content length
  const typingDuration = Math.min(
    Math.max(textContent.length * TYPING_SPEED_MS, MIN_TYPING_DURATION),
    MAX_TYPING_DURATION
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Process content on mount
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Add message to conversation context
    addMessage("alex", textContent, itemId);

    if (shouldShowTyping) {
      // Show typing indicator first
      setIsTyping(true);

      // After typing duration, show content
      const typingTimer = setTimeout(() => {
        setIsTyping(false);
        setShowContent(true);

        // Start auto-advance timer after content is shown
        if (autoAdvance && autoAdvanceDelay > 0) {
          autoAdvanceTimerRef.current = setTimeout(() => {
            onComplete?.();
          }, autoAdvanceDelay);
        }
      }, typingDuration);

      return () => clearTimeout(typingTimer);
    } else {
      // Skip typing animation
      setShowContent(true);

      // Start auto-advance timer immediately
      if (autoAdvance && autoAdvanceDelay > 0) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          onComplete?.();
        }, autoAdvanceDelay);
      }
    }
  }, [
    addMessage,
    itemId,
    textContent,
    shouldShowTyping,
    typingDuration,
    autoAdvance,
    autoAdvanceDelay,
    onComplete,
  ]);

  // Handle skip (tap to continue)
  const handleSkip = useCallback(() => {
    if (showContent) {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      onComplete?.();
    }
  }, [showContent, onComplete]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (showContent && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        handleSkip();
      }
    },
    [showContent, handleSkip]
  );

  // Render the appropriate content based on type
  const renderContent = () => {
    switch (content.type) {
      case "text":
        return <TextContent content={content.content} />;
      case "quote":
        return (
          <QuoteContent
            content={content.content}
            author={(content as QuoteBlock).author}
          />
        );
      case "tip":
        return <TipContent content={content.content} />;
      case "warning":
        return <WarningContent content={content.content} />;
      default: {
        // Exhaustive check - this should never happen
        const _exhaustive: never = content;
        return <TextContent content={(_exhaustive as TextBlock).content} />;
      }
    }
  };

  return (
    <div
      className={`conversational-content ${className}`.trim()}
      style={containerStyle}
      data-testid={`content-${itemId}`}
      onKeyDown={handleKeyDown}
      role="article"
      aria-labelledby={`content-label-${itemId}`}
      tabIndex={showContent ? 0 : -1}
    >
      <div style={messageSectionStyle}>
        <div style={avatarContainerStyle}>
          <Avatar size="small" />
        </div>

        <div style={bubbleContainerStyle}>
          <AnimatePresence mode="wait">
            {isTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                data-testid={`content-typing-${itemId}`}
              >
                <TypingIndicator />
              </motion.div>
            )}

            {showContent && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.25,
                  ease: [0.16, 1, 0.3, 1],
                }}
                data-testid={`content-bubble-${itemId}`}
              >
                <ChatBubble variant="alex" animate={false}>
                  <div id={`content-label-${itemId}`}>{renderContent()}</div>
                </ChatBubble>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Continue button (shown after content) */}
      <AnimatePresence>
        {showContent && (
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
            data-testid={`content-continue-${itemId}`}
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
// Content Type Sub-components
// ===========================

interface TextContentProps {
  content: string;
}

/** Plain text content */
function TextContent({ content }: TextContentProps) {
  return (
    <div style={textContentStyle} data-content-type="text">
      {content}
    </div>
  );
}

interface QuoteContentProps {
  content: string;
  author?: string;
}

/** Quote with optional author attribution */
function QuoteContent({ content, author }: QuoteContentProps) {
  return (
    <blockquote style={quoteContentStyle} data-content-type="quote">
      <span style={quoteMarkStyle} aria-hidden="true">
        &ldquo;
      </span>
      <span style={quoteTextStyle}>{content}</span>
      <span style={quoteMarkStyle} aria-hidden="true">
        &rdquo;
      </span>
      {author && <cite style={quoteAuthorStyle}>— {author}</cite>}
    </blockquote>
  );
}

interface TipContentProps {
  content: string;
}

/** Tip with icon and green accent */
function TipContent({ content }: TipContentProps) {
  return (
    <div style={tipContentStyle} data-content-type="tip">
      <span style={tipIconStyle} aria-hidden="true">
        💡
      </span>
      <div style={tipTextContainerStyle}>
        <span style={tipLabelStyle}>Pro Tip</span>
        <span style={tipTextStyle}>{content}</span>
      </div>
    </div>
  );
}

interface WarningContentProps {
  content: string;
}

/** Warning with icon and amber accent */
function WarningContent({ content }: WarningContentProps) {
  return (
    <div style={warningContentStyle} data-content-type="warning">
      <span style={warningIconStyle} aria-hidden="true">
        ⚠️
      </span>
      <div style={warningTextContainerStyle}>
        <span style={warningLabelStyle}>Watch Out</span>
        <span style={warningTextStyle}>{content}</span>
      </div>
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

const messageSectionStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  alignItems: "flex-start",
};

const avatarContainerStyle: React.CSSProperties = {
  flexShrink: 0,
};

const bubbleContainerStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const textContentStyle: React.CSSProperties = {
  fontSize: "var(--text-base, 16px)",
  lineHeight: 1.6,
  color: "inherit",
  whiteSpace: "pre-wrap",
};

const quoteContentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  margin: 0,
  fontStyle: "italic",
};

const quoteMarkStyle: React.CSSProperties = {
  fontSize: "1.5em",
  lineHeight: 1,
  color: "var(--primary)",
  opacity: 0.6,
};

const quoteTextStyle: React.CSSProperties = {
  fontSize: "var(--text-base, 16px)",
  lineHeight: 1.6,
};

const quoteAuthorStyle: React.CSSProperties = {
  display: "block",
  marginTop: "var(--space-2)",
  fontSize: "var(--text-sm, 14px)",
  fontStyle: "normal",
  color: "var(--text-muted, #6b7280)",
};

const tipContentStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  padding: "var(--space-3)",
  backgroundColor: "var(--success-soft)",
  borderRadius: "12px",
  marginTop: "-8px",
  marginBottom: "-8px",
  marginLeft: "-8px",
  marginRight: "-8px",
};

const tipIconStyle: React.CSSProperties = {
  fontSize: "1.25em",
  flexShrink: 0,
};

const tipTextContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
};

const tipLabelStyle: React.CSSProperties = {
  fontSize: "var(--text-sm, 14px)",
  fontWeight: 600,
  color: "var(--success-text, #166534)",
};

const tipTextStyle: React.CSSProperties = {
  fontSize: "var(--text-base, 16px)",
  lineHeight: 1.5,
  color: "var(--foreground)",
};

const warningContentStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  padding: "var(--space-3)",
  backgroundColor: "var(--warning-soft)",
  borderRadius: "12px",
  marginTop: "-8px",
  marginBottom: "-8px",
  marginLeft: "-8px",
  marginRight: "-8px",
};

const warningIconStyle: React.CSSProperties = {
  fontSize: "1.25em",
  flexShrink: 0,
};

const warningTextContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
};

const warningLabelStyle: React.CSSProperties = {
  fontSize: "var(--text-sm, 14px)",
  fontWeight: 600,
  color: "var(--warning-text, #92400e)",
};

const warningTextStyle: React.CSSProperties = {
  fontSize: "var(--text-base, 16px)",
  lineHeight: 1.5,
  color: "var(--foreground)",
};

const continueButtonStyle: React.CSSProperties = {
  alignSelf: "center",
  minHeight: "var(--button-h)",
  padding: "12px 32px",
  backgroundColor: "var(--primary)",
  color: "white",
  border: "none",
  borderRadius: "9999px",
  fontSize: "var(--text-base, 16px)",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "var(--space-2)",
};

export default ConversationalContent;
