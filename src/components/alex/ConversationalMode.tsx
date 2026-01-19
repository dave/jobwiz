"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Avatar } from "./Avatar";
import { ChatBubble } from "./ChatBubble";
import type { ConversationMessage } from "@/types";

export interface ConversationalModeProps {
  /** Messages to display in the conversation */
  messages: ConversationMessage[];
  /** Currently active content (options, continue button, etc.) */
  children?: ReactNode;
  /** Optional custom class name */
  className?: string;
  /** Optional test ID */
  "data-testid"?: string;
  /** Ref to receive focus when mode activates */
  focusRef?: React.RefObject<HTMLDivElement>;
}

/**
 * ConversationalMode - Scrolling chat interface with history.
 *
 * Layout:
 * - Messages render with small avatar (40px)
 * - User answers show as pills on right
 * - Auto-scroll to new messages
 * - "↓ New" indicator when scrolled up
 * - Full module history visible
 *
 * Used for: `text`, `quote`, `tip`, `warning`, `quiz`, `checklist`
 */
export function ConversationalMode({
  messages,
  children,
  className = "",
  "data-testid": testId,
  focusRef,
}: ConversationalModeProps) {
  const prefersReducedMotion = useReducedMotion();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const activeContentRef = useRef<HTMLDivElement>(null);

  // Track last announced message to avoid duplicate announcements
  const lastAnnouncedIdRef = useRef<string | null>(null);

  // Track if user has scrolled up from bottom
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  // Track if there are new messages while scrolled up
  const [hasNewMessages, setHasNewMessages] = useState(false);
  // Track the last message count to detect new messages
  const lastMessageCountRef = useRef(messages.length);
  // Track if we should auto-scroll
  const shouldAutoScrollRef = useRef(true);

  // Handle scroll events to detect when user scrolls up
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if user is near the bottom (within 100px)
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom) {
      setIsScrolledUp(false);
      setHasNewMessages(false);
      shouldAutoScrollRef.current = true;
    } else {
      setIsScrolledUp(true);
      shouldAutoScrollRef.current = false;
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive and announce to screen readers
  useEffect(() => {
    const newMessageCount = messages.length;
    const hadNewMessages = newMessageCount > lastMessageCountRef.current;

    if (hadNewMessages) {
      // Get the latest message for screen reader announcement
      const latestMessage = messages[messages.length - 1];

      // Announce new message to screen readers if not already announced
      if (
        latestMessage &&
        liveRegionRef.current &&
        latestMessage.id !== lastAnnouncedIdRef.current
      ) {
        const sender = latestMessage.sender === "alex" ? "Alex says" : "You said";
        liveRegionRef.current.textContent = `${sender}: ${latestMessage.content}`;
        lastAnnouncedIdRef.current = latestMessage.id;
      }

      if (shouldAutoScrollRef.current) {
        // Smooth scroll to bottom
        bottomRef.current?.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "end",
        });
      } else {
        // User scrolled up, show "new messages" indicator
        setHasNewMessages(true);
      }
    }

    lastMessageCountRef.current = newMessageCount;
  }, [messages, prefersReducedMotion]);

  // Focus management - move focus to active content when available
  useEffect(() => {
    // If there's active content (children), we might want to focus it
    // This allows keyboard users to interact with options/buttons immediately
    if (children && activeContentRef.current) {
      // Find first focusable element in active content
      const focusable = activeContentRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        // Small delay to ensure rendering is complete
        requestAnimationFrame(() => {
          focusable.focus();
        });
      }
    }
  }, [children]);

  // Set up ref forwarding for external focus control
  useEffect(() => {
    if (focusRef?.current === null && containerRef.current) {
      // TypeScript workaround - focusRef is readonly in the props
      // but we need to assign to it for focus management
      Object.assign(focusRef, { current: containerRef.current });
    }
  }, [focusRef]);

  // Handle clicking "New" indicator to scroll to bottom
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "end",
    });
    setIsScrolledUp(false);
    setHasNewMessages(false);
    shouldAutoScrollRef.current = true;
  }, [prefersReducedMotion]);

  // Animation variants for messages
  const messageVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.25,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.15,
      },
    },
  };

  // Animation variants for "New" indicator
  const indicatorVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      y: 10,
      scale: 0.9,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.15,
      },
    },
  };

  return (
    <div
      ref={containerRef}
      className={`conversational-mode ${className}`.trim()}
      style={containerStyle}
      data-testid={testId}
      role="log"
      aria-label="Conversation history"
      tabIndex={-1}
    >
      {/* Screen reader live region for announcing new messages */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        style={srOnlyStyle}
        data-testid="conversation-live-region"
      />

      {/* Scrollable messages container */}
      <div
        ref={scrollContainerRef}
        className="conversation-messages"
        style={scrollContainerStyle}
        onScroll={handleScroll}
        data-testid="conversation-scroll-container"
      >
        <div style={messagesInnerStyle}>
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                className="conversation-message"
                style={messageWrapperStyle(message.sender)}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                data-testid={`message-${message.id}`}
                data-sender={message.sender}
                aria-label={`${message.sender === "alex" ? "Alex" : "You"}: ${message.content}`}
              >
                {message.sender === "alex" ? (
                  <div style={alexMessageStyle}>
                    <div style={avatarContainerStyle}>
                      <Avatar size="small" />
                    </div>
                    <ChatBubble variant="alex" animate={false}>
                      <span style={messageTextStyle}>{message.content}</span>
                    </ChatBubble>
                  </div>
                ) : (
                  <ChatBubble variant="user" animate={false}>
                    <span style={userMessageTextStyle}>{message.content}</span>
                  </ChatBubble>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Active content area (options, continue button, etc.) */}
          {children && (
            <motion.div
              ref={activeContentRef}
              className="conversation-active-content"
              style={activeContentStyle}
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  duration: prefersReducedMotion ? 0 : 0.25,
                  delay: prefersReducedMotion ? 0 : 0.15,
                },
              }}
              role="region"
              aria-label="Current question options"
            >
              {children}
            </motion.div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* "New" indicator when scrolled up with new messages */}
      <AnimatePresence>
        {isScrolledUp && hasNewMessages && (
          <motion.button
            className="new-messages-indicator"
            style={newIndicatorStyle}
            onClick={scrollToBottom}
            variants={indicatorVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Scroll to new messages"
            data-testid="new-messages-indicator"
          >
            <span style={arrowStyle} aria-hidden="true">↓</span>
            <span>New</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Container style - full height flex container
 */
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: "100dvh",
  position: "relative",
  backgroundColor: "var(--background, #ffffff)",
};

/**
 * Scroll container style - takes full available height, scrolls internally
 */
const scrollContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  scrollBehavior: "smooth",
};

/**
 * Inner container for messages - adds padding with safe area insets
 */
const messagesInnerStyle: React.CSSProperties = {
  padding: "var(--space-4)",
  paddingTop: "calc(var(--space-4) + env(safe-area-inset-top))",
  paddingBottom: "calc(var(--space-8) + env(safe-area-inset-bottom))",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  minHeight: "100%",
};

/**
 * Message wrapper style - handles alignment based on sender
 */
const messageWrapperStyle = (
  sender: "alex" | "user"
): React.CSSProperties => ({
  display: "flex",
  justifyContent: sender === "alex" ? "flex-start" : "flex-end",
  width: "100%",
});

/**
 * Alex message style - avatar + bubble layout
 */
const alexMessageStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  alignItems: "flex-start",
  maxWidth: "calc(100% - 48px)",
};

/**
 * Avatar container style
 */
const avatarContainerStyle: React.CSSProperties = {
  flexShrink: 0,
};

/**
 * Message text style for Alex bubbles
 */
const messageTextStyle: React.CSSProperties = {
  fontSize: "var(--text-base)",
  lineHeight: 1.6,
  color: "var(--alex-bubble-text, var(--foreground))",
};

/**
 * Message text style for user bubbles
 */
const userMessageTextStyle: React.CSSProperties = {
  fontSize: "var(--text-sm)",
  lineHeight: 1.5,
  fontWeight: 500,
};

/**
 * Active content area style
 */
const activeContentStyle: React.CSSProperties = {
  marginTop: "var(--space-2)",
};

/**
 * "New" indicator button style - 48px min touch target
 */
const newIndicatorStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "calc(var(--space-6) + env(safe-area-inset-bottom))",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  padding: "var(--space-3) var(--space-4)",
  backgroundColor: "var(--primary)",
  color: "white",
  borderRadius: "9999px",
  border: "none",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  cursor: "pointer",
  zIndex: 50,
  minHeight: "48px", // Touch target minimum
  minWidth: "80px",
};

/**
 * Arrow icon style in "New" indicator
 */
const arrowStyle: React.CSSProperties = {
  fontSize: "var(--text-base)",
};

/**
 * Screen reader only style - visually hidden but accessible
 */
const srOnlyStyle: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export default ConversationalMode;
