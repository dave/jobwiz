"use client";

import { motion, useReducedMotion } from "framer-motion";

export interface TypingIndicatorProps {
  /** Optional custom class name */
  className?: string;
}

/**
 * Typing indicator component showing three animated dots.
 *
 * Used to indicate that the coach "Alex" is typing a message.
 *
 * Features:
 * - Three dots with staggered bouncing animation
 * - Respects reduced-motion preferences
 * - Uses alex bubble styling
 */
export function TypingIndicator({ className = "" }: TypingIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={`typing-indicator ${className}`.trim()}
      style={containerStyle}
      role="status"
      aria-label="Alex is typing"
    >
      <div className="typing-dots" style={dotsContainerStyle}>
        {[0, 1, 2].map((index) => (
          <TypingDot
            key={index}
            index={index}
            animate={!prefersReducedMotion}
          />
        ))}
      </div>
    </div>
  );
}

interface TypingDotProps {
  index: number;
  animate: boolean;
}

/**
 * Individual typing dot with bounce animation.
 */
function TypingDot({ index, animate }: TypingDotProps) {
  // Staggered delay: 0ms, 150ms, 300ms
  const delay = index * 0.15;

  // Animation variants for bounce effect
  const variants = {
    initial: {
      y: 0,
    },
    animate: {
      y: [-2, 2, -2],
    },
  };

  // Infinite loop animation
  const transition = {
    duration: 0.6,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay,
  };

  return (
    <motion.span
      className="typing-dot"
      style={dotStyle}
      variants={variants}
      initial="initial"
      animate={animate ? "animate" : "initial"}
      transition={animate ? transition : undefined}
      aria-hidden="true"
    />
  );
}

/**
 * Container style - uses alex bubble styling
 */
const containerStyle: React.CSSProperties = {
  backgroundColor: "var(--alex-bubble-bg)",
  padding: "var(--space-4)", // 16px
  borderRadius: "4px 20px 20px 20px", // tail top-left like alex bubble
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  display: "inline-block",
};

/**
 * Dots container style
 */
const dotsContainerStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  alignItems: "center",
  height: "20px",
};

/**
 * Individual dot style
 */
const dotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#9ca3af", // gray-400
  display: "inline-block",
};

export default TypingIndicator;
