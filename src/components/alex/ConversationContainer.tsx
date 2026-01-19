"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCarousel } from "@/components/carousel";
import { useConversation, ConversationProvider } from "./ConversationContext";
import { BigQuestionMode } from "./BigQuestionMode";
import { ConversationalMode } from "./ConversationalMode";
import { SectionTimeline } from "./SectionTimeline";
import type { ContentBlockType, ConversationDisplayMode } from "@/types";

/**
 * Content block types that use Big Question mode (full-screen, centered)
 */
const BIG_QUESTION_TYPES: ContentBlockType[] = [
  "header",
  "video",
  "audio",
  "image",
  "infographic",
];

/**
 * Content block types that use Conversational mode (scrolling chat)
 */
const CONVERSATIONAL_TYPES: ContentBlockType[] = [
  "text",
  "quote",
  "tip",
  "warning",
  "quiz",
  "checklist",
];

/**
 * Determine the display mode for a content block type
 */
export function getDisplayModeForType(
  type: ContentBlockType
): ConversationDisplayMode {
  if (BIG_QUESTION_TYPES.includes(type)) {
    return "big-question";
  }
  return "conversational";
}

export interface ConversationContainerProps {
  /** Content to render in the current mode */
  children: ReactNode;
  /** Callback when user exits (e.g., navigates back to journey page) */
  onExit?: () => void;
  /** Optional class name */
  className?: string;
  /** Optional test ID */
  "data-testid"?: string;
}

/**
 * Inner container that has access to both carousel and conversation contexts
 */
function ConversationContainerInner({
  children,
  onExit,
  className = "",
  "data-testid": testId,
}: ConversationContainerProps) {
  const prefersReducedMotion = useReducedMotion();
  const carousel = useCarousel();
  const conversation = useConversation();

  const { currentItem, next, isLastItem, isAtPaywall } = carousel;
  const { messages, displayMode, setDisplayMode } = conversation;

  // Track the previous display mode for transition animation
  const [prevMode, setPrevMode] = useState<ConversationDisplayMode>(displayMode);

  // Determine the correct display mode based on current item's content type
  const targetMode = useMemo<ConversationDisplayMode>(() => {
    if (!currentItem) return "big-question";

    const contentType = currentItem.content?.type;
    if (!contentType) return "big-question";

    return getDisplayModeForType(contentType);
  }, [currentItem]);

  // Update display mode when target mode changes
  useEffect(() => {
    if (targetMode !== displayMode) {
      setPrevMode(displayMode);
      setDisplayMode(targetMode);
    }
  }, [targetMode, displayMode, setDisplayMode]);

  // Handle continue action (advance to next item)
  const handleContinue = useCallback(() => {
    if (!isLastItem && !isAtPaywall) {
      next();
    }
  }, [next, isLastItem, isAtPaywall]);

  // Handle exit action (Escape key or explicit exit)
  const handleExit = useCallback(() => {
    onExit?.();
  }, [onExit]);

  // Handle keyboard navigation at the container level
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        handleExit();
      }
      // Note: Enter is handled within BigQuestionMode/ConversationalMode
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExit]);

  // Handle tap to continue in big-question mode
  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only in big-question mode and not on buttons/interactive elements
      if (displayMode !== "big-question") return;

      const target = event.target as HTMLElement;
      // Don't trigger on buttons, links, or other interactive elements
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest('[role="button"]') ||
        target.closest("input") ||
        target.closest("video") ||
        target.closest("audio")
      ) {
        return;
      }

      handleContinue();
    },
    [displayMode, handleContinue]
  );

  // Determine transition direction
  const transitionDirection = useMemo(() => {
    if (prevMode === "conversational" && displayMode === "big-question") {
      return "from-conversational";
    }
    if (prevMode === "big-question" && displayMode === "conversational") {
      return "from-big-question";
    }
    return "none";
  }, [prevMode, displayMode]);

  // Animation variants for mode transitions
  const modeTransitionVariants = {
    "from-conversational": {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    "from-big-question": {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    none: {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
    },
  };

  const currentVariants = modeTransitionVariants[transitionDirection];

  return (
    <div
      className={`conversation-container ${className}`.trim()}
      style={containerStyle}
      onClick={handleContainerClick}
      data-testid={testId}
      data-display-mode={displayMode}
    >
      {/* Desktop: Timeline sidebar (visible on lg+) */}
      <SectionTimeline
        className="z-10"
        data-testid="conversation-timeline"
      />

      {/* Main content area */}
      <div style={mainContentStyle}>
        <AnimatePresence mode="wait">
          <motion.div
            key={displayMode}
            initial={prefersReducedMotion ? false : currentVariants.initial}
            animate={currentVariants.animate}
            exit={prefersReducedMotion ? undefined : currentVariants.exit}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ height: "100%", width: "100%" }}
          >
            {displayMode === "big-question" ? (
              <BigQuestionMode
                onContinue={handleContinue}
                onExit={handleExit}
                tapToAdvance={false} // We handle tap at container level
                data-testid="big-question-mode"
              >
                {children}
              </BigQuestionMode>
            ) : (
              <ConversationalMode
                messages={messages}
                data-testid="conversational-mode"
              >
                {children}
              </ConversationalMode>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * ConversationContainer - Main container orchestrating conversation UI.
 *
 * Responsibilities:
 * - Wraps ConversationContext
 * - Determines display mode per item type
 * - Renders SectionTimeline (desktop sidebar, mobile drawer)
 * - Switches between BigQuestionMode / ConversationalMode
 * - Keyboard navigation: Enter = continue, Escape = exit
 * - Touch: tap to continue (in big-question mode)
 *
 * Must be nested inside CarouselProvider.
 */
export function ConversationContainer(props: ConversationContainerProps) {
  return (
    <ConversationProvider>
      <ConversationContainerInner {...props} />
    </ConversationProvider>
  );
}

/**
 * Container style - full viewport, flex layout for sidebar
 */
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  minHeight: "100dvh",
  width: "100%",
  backgroundColor: "var(--background, #ffffff)",
  position: "relative",
};

/**
 * Main content area style - takes remaining space after sidebar
 */
const mainContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0, // Allow shrinking below content size
  display: "flex",
  flexDirection: "column",
};

export default ConversationContainer;
