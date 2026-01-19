"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

export interface AvatarProps {
  /** Avatar size variant */
  size: "small" | "large";
  /** Optional custom class name */
  className?: string;
  /** Optional alt text override */
  alt?: string;
}

const sizeMap = {
  small: {
    dimension: 40,
    cssVar: "var(--avatar-sm)",
  },
  large: {
    dimension: 72,
    cssVar: "var(--avatar-lg)",
  },
} as const;

/**
 * Avatar component for the Alex coach character.
 *
 * Features:
 * - Two sizes: small (40px) for conversation mode, large (72px) for big question mode
 * - Spring animation on mount
 * - Fallback to initials if image fails to load
 * - Respects reduced-motion preferences
 */
export function Avatar({ size, className = "", alt = "Alex" }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const { dimension, cssVar } = sizeMap[size];

  // Animation variants
  const variants = {
    hidden: {
      scale: 0,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
    },
  };

  // Spring transition for bouncy effect
  const springTransition = {
    type: "spring" as const,
    stiffness: 260,
    damping: 20,
    duration: 0.5,
  };

  // Instant transition for reduced motion
  const reducedMotionTransition = {
    duration: 0,
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-full flex-shrink-0 ${className}`}
      style={{
        width: cssVar,
        height: cssVar,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
      initial={prefersReducedMotion ? "visible" : "hidden"}
      animate="visible"
      variants={variants}
      transition={prefersReducedMotion ? reducedMotionTransition : springTransition}
      aria-hidden="true"
    >
      {imageError ? (
        <FallbackAvatar dimension={dimension} />
      ) : (
        <Image
          src="/alex-avatar.jpg"
          alt={alt}
          width={dimension}
          height={dimension}
          className="object-cover w-full h-full"
          onError={() => setImageError(true)}
          priority={size === "large"}
        />
      )}
    </motion.div>
  );
}

/**
 * Fallback avatar showing initials when image fails to load.
 */
function FallbackAvatar({ dimension }: { dimension: number }) {
  const fontSize = dimension * 0.4;

  return (
    <div
      className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-semibold"
      style={{ fontSize }}
      aria-label="Alex avatar fallback"
    >
      A
    </div>
  );
}

export default Avatar;
