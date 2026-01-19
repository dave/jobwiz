"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type ChatBubbleVariant = "alex" | "user";

export interface ChatBubbleProps {
  /** Bubble variant - alex (coach) or user (answer) */
  variant: ChatBubbleVariant;
  /** Content to display inside the bubble */
  children: ReactNode;
  /** Optional custom class name */
  className?: string;
  /** Whether to animate the bubble appearing */
  animate?: boolean;
}

/**
 * Chat bubble component for the conversation UI.
 *
 * Two variants:
 * - **alex**: Left-aligned bubble with tail top-left (coach messages)
 * - **user**: Right-aligned pill shape (user answers)
 *
 * Features:
 * - Uses CSS variables from design tokens
 * - Fade-in animation on mount
 * - Respects reduced-motion preferences
 */
export function ChatBubble({
  variant,
  children,
  className = "",
  animate = true,
}: ChatBubbleProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  const isAlex = variant === "alex";

  // Animation variants
  const variants = {
    hidden: {
      opacity: 0,
      y: 8,
    },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  // Transition settings
  const transition = {
    duration: 0.25, // --duration-normal
    ease: [0.16, 1, 0.3, 1] as const, // --ease-out
  };

  const baseClasses = isAlex
    ? "alex-bubble"
    : "user-bubble flex justify-end";

  return (
    <motion.div
      className={`${baseClasses} ${className}`.trim()}
      initial={shouldAnimate ? "hidden" : "visible"}
      animate="visible"
      variants={variants}
      transition={shouldAnimate ? transition : { duration: 0 }}
      data-variant={variant}
    >
      <div
        className={isAlex ? "alex-bubble-inner" : "user-bubble-inner"}
        style={isAlex ? alexBubbleStyle : userBubbleStyle}
      >
        {children}
      </div>
    </motion.div>
  );
}

/**
 * Style object for Alex (coach) bubble.
 * - Background: --alex-bubble-bg
 * - Padding: 16px
 * - Border-radius: 4px 20px 20px 20px (tail top-left)
 * - Max-width: 320px
 * - Shadow: 0 1px 2px rgba(0,0,0,0.05)
 */
const alexBubbleStyle: React.CSSProperties = {
  backgroundColor: "var(--alex-bubble-bg)",
  padding: "var(--space-4)", // 16px
  borderRadius: "4px 20px 20px 20px", // tail top-left
  maxWidth: "var(--bubble-max-w)", // 320px
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
};

/**
 * Style object for User (answer) bubble.
 * - Background: --user-bubble-bg
 * - Padding: 12px 16px
 * - Border-radius: 20px all corners
 * - No shadow
 */
const userBubbleStyle: React.CSSProperties = {
  backgroundColor: "var(--user-bubble-bg)",
  padding: "var(--space-3) var(--space-4)", // 12px 16px
  borderRadius: "var(--bubble-radius)", // 20px
  color: "white",
};

export default ChatBubble;
