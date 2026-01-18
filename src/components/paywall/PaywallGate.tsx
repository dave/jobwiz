"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isUnlocked, setUnlocked } from "./unlock-state";

/** Paywall gate variant for AB testing */
export type PaywallVariant = "hard" | "soft" | "teaser";

/** Analytics tracking event */
export interface PaywallTrackEvent {
  eventType: "paywall_impression" | "paywall_cta_click" | "paywall_unlock";
  journeyId: string;
  variant: PaywallVariant;
  price: number;
  timestamp: number;
}

export interface PaywallGateProps {
  /** Journey ID for persistence */
  journeyId: string;
  /** Content to show/hide behind paywall */
  children: ReactNode;
  /** Price to display (in dollars) */
  price: number;
  /** Paywall variant for AB testing */
  variant?: PaywallVariant;
  /** Custom heading text */
  heading?: string;
  /** Custom description text */
  description?: string;
  /** Custom CTA button text */
  ctaText?: string;
  /** Enable mock mode (no real Stripe) */
  mockMode?: boolean;
  /** Callback for analytics tracking */
  onTrack?: (event: PaywallTrackEvent) => void;
  /** Callback when content is unlocked */
  onUnlock?: () => void;
  /** Callback when CTA is clicked (for real Stripe integration) */
  onPurchase?: () => Promise<boolean>;
  /** Teaser content for teaser variant (first paragraph preview) */
  teaserContent?: ReactNode;
}

const LockIcon = () => (
  <svg
    className="h-12 w-12 mx-auto text-indigo-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-5 w-5 text-green-500"
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

export function PaywallGate({
  journeyId,
  children,
  price,
  variant = "hard",
  heading = "Unlock Premium Content",
  description = "Get full access to expert insights, practice questions, and company-specific strategies.",
  ctaText = "Unlock Now",
  mockMode = true,
  onTrack,
  onUnlock,
  onPurchase,
  teaserContent,
}: PaywallGateProps) {
  // Initialize with localStorage value to avoid flash of paywall
  const [isContentUnlocked, setIsContentUnlocked] = useState(() => isUnlocked(journeyId));
  const [isLoading, setIsLoading] = useState(false);
  const hasTrackedImpression = useRef(false);

  // Re-check unlock status if journeyId changes
  useEffect(() => {
    setIsContentUnlocked(isUnlocked(journeyId));
  }, [journeyId]);

  // Track impression once when paywall is shown
  useEffect(() => {
    if (!hasTrackedImpression.current && !isContentUnlocked) {
      hasTrackedImpression.current = true;
      onTrack?.({
        eventType: "paywall_impression",
        journeyId,
        variant,
        price,
        timestamp: Date.now(),
      });
    }
  }, [isContentUnlocked, journeyId, variant, price, onTrack]);

  const handleUnlock = useCallback(async () => {
    // Track CTA click
    onTrack?.({
      eventType: "paywall_cta_click",
      journeyId,
      variant,
      price,
      timestamp: Date.now(),
    });

    setIsLoading(true);

    try {
      let success = false;

      if (mockMode) {
        // Mock mode: simulate a brief delay then unlock
        await new Promise((resolve) => setTimeout(resolve, 500));
        success = true;
      } else if (onPurchase) {
        // Real mode: call purchase handler
        success = await onPurchase();
      }

      if (success) {
        setUnlocked(journeyId, true);
        setIsContentUnlocked(true);

        // Track unlock event
        onTrack?.({
          eventType: "paywall_unlock",
          journeyId,
          variant,
          price,
          timestamp: Date.now(),
        });

        onUnlock?.();
      }
    } finally {
      setIsLoading(false);
    }
  }, [journeyId, variant, price, mockMode, onTrack, onPurchase, onUnlock]);

  // If already unlocked, show content directly
  if (isContentUnlocked) {
    return <>{children}</>;
  }

  // Format price
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

  // Value propositions
  const benefits = [
    "Expert interview strategies",
    "Company-specific insights",
    "Practice questions with answers",
    "Personalized preparation tips",
  ];

  return (
    <div className="relative">
      {/* Background content based on variant */}
      {variant === "soft" && (
        <div
          className="absolute inset-0 overflow-hidden select-none pointer-events-none"
          aria-hidden="true"
          data-testid="blurred-preview"
        >
          <div className="blur-sm opacity-40">{children}</div>
        </div>
      )}

      {variant === "teaser" && teaserContent && (
        <div className="mb-6">
          <div className="prose prose-gray max-w-none">{teaserContent}</div>
          <div className="relative h-24 bg-gradient-to-b from-transparent via-white/70 to-white" />
        </div>
      )}

      {/* Paywall overlay */}
      <div
        className={cn(
          "relative z-10",
          variant === "soft" && "bg-white/95 backdrop-blur-sm",
          variant === "teaser" && "-mt-24"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-heading"
      >
        <div className="max-w-lg mx-auto p-8 text-center">
          {/* Lock icon */}
          <LockIcon />

          {/* Heading */}
          <h2
            id="paywall-heading"
            className="mt-4 text-2xl font-bold text-gray-900"
          >
            {heading}
          </h2>

          {/* Description */}
          <p className="mt-2 text-gray-600">{description}</p>

          {/* Price */}
          <div className="mt-6">
            <span className="text-4xl font-bold text-gray-900" data-testid="price">
              {formattedPrice}
            </span>
            <span className="text-gray-500 ml-2">one-time</span>
          </div>

          {/* Benefits list */}
          <ul className="mt-6 space-y-2 text-left max-w-sm mx-auto">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckIcon />
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <button
            type="button"
            onClick={handleUnlock}
            disabled={isLoading}
            className={cn(
              "mt-8 w-full max-w-sm py-3 px-6 rounded-lg font-semibold text-white",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
              isLoading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            )}
            aria-label={`${ctaText} for ${formattedPrice}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              `${ctaText} - ${formattedPrice}`
            )}
          </button>

          {/* Mock mode indicator (for development) */}
          {mockMode && (
            <p className="mt-4 text-xs text-gray-400">
              Demo mode: No payment required
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
