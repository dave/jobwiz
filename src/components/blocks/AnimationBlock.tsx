"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AnimationBlock as AnimationBlockType } from "@/types/module";
import type { BlockBaseProps } from "./types";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";

type AnimationBlockProps = BlockBaseProps & {
  block: AnimationBlockType;
};

export function AnimationBlock({ block, onComplete }: AnimationBlockProps) {
  const { animationUrl, loop = true, autoplay = true } = block;
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const hasCompletedRef = useRef(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Fetch animation data
  useEffect(() => {
    if (!animationUrl) {
      setError("No animation URL provided");
      return;
    }

    const fetchAnimation = async () => {
      try {
        const response = await fetch(animationUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch animation: ${response.status}`);
        }
        const data = await response.json();
        setAnimationData(data);
      } catch (e) {
        setError("Unable to load animation");
        console.error("Animation fetch error:", e);
      }
    };

    fetchAnimation();
  }, [animationUrl]);

  // Handle animation complete (only if not looping)
  const handleComplete = () => {
    if (!loop && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete?.();
    }
  };

  if (error) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!animationData) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading animation...</div>
      </div>
    );
  }

  // Show static first frame if user prefers reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          "bg-gray-50 rounded-lg p-4",
          "flex items-center justify-center"
        )}
        role="img"
        aria-label="Animation (paused due to reduced motion preference)"
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={false}
          autoplay={false}
          className="w-full max-w-md"
        />
        <span className="sr-only">Animation paused due to reduced motion preference</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        onComplete={handleComplete}
        className="w-full max-w-md"
      />
    </div>
  );
}
