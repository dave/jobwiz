"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Avatar } from "./Avatar";

export interface BigQuestionModeProps {
  /** Content to display in the center (header, video, audio, image, infographic) */
  children: ReactNode;
  /** Callback when user wants to continue (button click, tap, or Enter key) */
  onContinue: () => void;
  /** Optional callback when user exits (Escape key) */
  onExit?: () => void;
  /** Whether tap anywhere advances (default: false) */
  tapToAdvance?: boolean;
  /** Continue button text (default: "Continue") */
  continueText?: string;
  /** Whether continue button is disabled */
  continueDisabled?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Optional test ID */
  "data-testid"?: string;
}

/**
 * BigQuestionMode - Full-screen dramatic display mode.
 *
 * Layout:
 * - Large avatar (72px) centered at top
 * - Content centered below avatar
 * - Continue button at bottom
 *
 * Used for: `header`, `video`, `audio`, `image`, `infographic`
 *
 * Behavior:
 * - Full viewport height (min-h-screen with safe area insets)
 * - Content vertically centered
 * - Tap anywhere or click Continue to advance (configurable)
 * - Keyboard: Enter = continue, Escape = exit
 */
export function BigQuestionMode({
  children,
  onContinue,
  onExit,
  tapToAdvance = false,
  continueText = "Continue",
  continueDisabled = false,
  className = "",
  "data-testid": testId,
}: BigQuestionModeProps) {
  const prefersReducedMotion = useReducedMotion();

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" && !continueDisabled) {
        event.preventDefault();
        onContinue();
      } else if (event.key === "Escape" && onExit) {
        event.preventDefault();
        onExit();
      }
    },
    [onContinue, onExit, continueDisabled]
  );

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle tap anywhere to advance
  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Don't trigger if clicking on the button itself or if disabled
      if (
        tapToAdvance &&
        !continueDisabled &&
        !(event.target as HTMLElement).closest("button")
      ) {
        onContinue();
      }
    },
    [tapToAdvance, continueDisabled, onContinue]
  );

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        staggerChildren: prefersReducedMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.25,
        ease: [0.16, 1, 0.3, 1] as const, // --ease-out
      },
    },
  };

  return (
    <motion.div
      className={`big-question-mode ${className}`.trim()}
      style={containerStyle}
      onClick={handleContainerClick}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      data-testid={testId}
      role="region"
      aria-label="Content display"
    >
      {/* Large Avatar at top */}
      <motion.div
        className="big-question-avatar"
        style={avatarContainerStyle}
        variants={itemVariants}
      >
        <Avatar size="large" />
      </motion.div>

      {/* Centered Content */}
      <motion.div
        className="big-question-content"
        style={contentContainerStyle}
        variants={itemVariants}
      >
        {children}
      </motion.div>

      {/* Continue Button at bottom */}
      <motion.div
        className="big-question-footer"
        style={footerStyle}
        variants={itemVariants}
      >
        <button
          onClick={onContinue}
          disabled={continueDisabled}
          style={{
            ...buttonStyle,
            opacity: continueDisabled ? 0.5 : 1,
            cursor: continueDisabled ? "not-allowed" : "pointer",
          }}
          aria-label={continueText}
          data-testid="continue-button"
        >
          {continueText}
        </button>
      </motion.div>
    </motion.div>
  );
}

/**
 * Container style - full viewport with flex column layout
 * Uses 100dvh (dynamic viewport height) for mobile with fallback
 * Includes safe area insets for notch/home indicator
 */
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "100dvh", // Dynamic viewport height for mobile (fallback handled by CSS)
  padding: "var(--space-8) var(--space-4)",
  paddingTop: "calc(var(--space-8) + env(safe-area-inset-top))",
  paddingBottom: "calc(var(--space-8) + env(safe-area-inset-bottom))",
  backgroundColor: "var(--background, #ffffff)",
  overflowX: "hidden", // Prevent horizontal overflow
};

/**
 * Avatar container style - centered at top
 */
const avatarContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  paddingTop: "var(--space-6)",
};

/**
 * Content container style - centered, flexible
 */
const contentContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  width: "100%",
  maxWidth: "600px",
  padding: "var(--space-6) 0",
  textAlign: "center",
};

/**
 * Footer style - full width button container
 */
const footerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  paddingTop: "var(--space-4)",
};

/**
 * Continue button style
 * - Height: 48px (--button-h)
 * - Border-radius: 12px
 * - Background: var(--primary)
 * - Font-weight: 600
 * - Full width
 */
const buttonStyle: React.CSSProperties = {
  width: "100%",
  height: "var(--button-h)", // 48px
  minHeight: "48px",
  borderRadius: "12px",
  backgroundColor: "var(--primary)",
  color: "white",
  fontWeight: 600,
  fontSize: "16px",
  border: "none",
  transition: "opacity 150ms ease, transform 150ms ease",
};

export default BigQuestionMode;
