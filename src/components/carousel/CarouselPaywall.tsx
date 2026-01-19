"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCarousel } from "./CarouselContext";
import { isUnlocked, setUnlocked } from "@/components/paywall/unlock-state";

/**
 * Analytics tracking event for carousel paywall
 */
export interface CarouselPaywallTrackEvent {
  eventType: "paywall_impression" | "paywall_cta_click" | "paywall_unlock";
  companySlug: string;
  roleSlug: string;
  price: number;
  timestamp: number;
}

export interface CarouselPaywallProps {
  /** Price to display (in dollars) */
  price: number;
  /** Custom heading text */
  heading?: string;
  /** Custom description text */
  description?: string;
  /** Custom CTA button text */
  ctaText?: string;
  /** Enable mock mode (no real Stripe) */
  mockMode?: boolean;
  /** Callback for analytics tracking */
  onTrack?: (event: CarouselPaywallTrackEvent) => void;
  /** Callback when content is unlocked (auto-advances to next item) */
  onUnlock?: () => void;
  /** Callback when CTA is clicked (for real Stripe integration) */
  onPurchase?: () => Promise<boolean>;
  /** List of benefits to display */
  benefits?: string[];
  /** Custom class name */
  className?: string;
  /** Skip paywall if user already has access (checked on mount) */
  alreadyPurchased?: boolean;
}

const LockIcon = () => (
  <svg
    className="h-16 w-16 mx-auto text-indigo-500"
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
    className="h-5 w-5 text-green-500 shrink-0"
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

const SpinnerIcon = () => (
  <svg
    className="animate-spin h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
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
);

const DEFAULT_BENEFITS = [
  "Company-specific interview strategies",
  "Expert insights and insider tips",
  "Practice questions with detailed answers",
  "Culture fit and behavioral prep",
];

/**
 * CarouselPaywall - Paywall shown as carousel item after Universal module
 *
 * Features:
 * - Blocks forward navigation until purchased
 * - Shows value prop and purchase CTA
 * - On purchase, auto-advances to next item
 * - Skip if user already purchased (via localStorage or alreadyPurchased prop)
 * - Centered layout with large typography for carousel display
 */
export function CarouselPaywall({
  price,
  heading = "Unlock Premium Content",
  description = "Get full access to company-specific interview preparation",
  ctaText = "Unlock Now",
  mockMode = true,
  onTrack,
  onUnlock,
  onPurchase,
  benefits = DEFAULT_BENEFITS,
  className,
  alreadyPurchased = false,
}: CarouselPaywallProps) {
  const { companySlug, roleSlug, next } = useCarousel();

  // Generate journey ID for unlock state persistence
  const journeyId = `carousel-${companySlug}-${roleSlug}`;

  // Check if already unlocked via localStorage or prop
  const [isContentUnlocked, setIsContentUnlocked] = useState(() => {
    if (alreadyPurchased) return true;
    return isUnlocked(journeyId);
  });
  const [isLoading, setIsLoading] = useState(false);
  const hasTrackedImpression = useRef(false);
  const hasAutoAdvanced = useRef(false);

  // Re-check unlock status on mount
  useEffect(() => {
    if (alreadyPurchased || isUnlocked(journeyId)) {
      setIsContentUnlocked(true);
    }
  }, [journeyId, alreadyPurchased]);

  // Track impression once when paywall is shown (and not already unlocked)
  useEffect(() => {
    if (!hasTrackedImpression.current && !isContentUnlocked) {
      hasTrackedImpression.current = true;
      onTrack?.({
        eventType: "paywall_impression",
        companySlug,
        roleSlug,
        price,
        timestamp: Date.now(),
      });
    }
  }, [isContentUnlocked, companySlug, roleSlug, price, onTrack]);

  // Auto-advance to next item when unlocked (returning user)
  useEffect(() => {
    if (isContentUnlocked && !hasAutoAdvanced.current) {
      hasAutoAdvanced.current = true;
      // Small delay to ensure state is consistent
      const timeout = setTimeout(() => {
        next();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isContentUnlocked, next]);

  const handleUnlock = useCallback(async () => {
    // Track CTA click
    onTrack?.({
      eventType: "paywall_cta_click",
      companySlug,
      roleSlug,
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
        // Persist unlock state
        setUnlocked(journeyId, true);
        setIsContentUnlocked(true);

        // Track unlock event
        onTrack?.({
          eventType: "paywall_unlock",
          companySlug,
          roleSlug,
          price,
          timestamp: Date.now(),
        });

        // Call onUnlock callback
        onUnlock?.();

        // Auto-advance to next item
        next();
      }
    } catch {
      // Purchase failed - just reset loading state
      // Error handling is done by the parent component if needed
    } finally {
      setIsLoading(false);
    }
  }, [journeyId, companySlug, roleSlug, price, mockMode, onTrack, onPurchase, onUnlock, next]);

  // Format price
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

  // If already unlocked, render nothing (auto-advance will happen)
  // This provides a brief flash state before advancing
  if (isContentUnlocked) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center min-h-[400px]", className)}
        data-testid="paywall-loading"
      >
        <SpinnerIcon />
        <p className="mt-4 text-gray-600">Loading content...</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Carousel-optimized layout: centered, full-height
        "flex flex-col items-center justify-center",
        "min-h-[400px] px-4",
        "sm:px-6 lg:px-8",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="carousel-paywall-heading"
      data-testid="carousel-paywall"
    >
      <div className="max-w-md w-full text-center">
        {/* Lock icon */}
        <LockIcon />

        {/* Heading */}
        <h2
          id="carousel-paywall-heading"
          className="mt-6 text-2xl font-bold text-gray-900 sm:text-3xl"
        >
          {heading}
        </h2>

        {/* Description */}
        <p className="mt-3 text-gray-600 text-lg">{description}</p>

        {/* Price */}
        <div className="mt-8">
          <span
            className="text-5xl font-bold text-gray-900"
            data-testid="paywall-price"
          >
            {formattedPrice}
          </span>
          <span className="text-gray-500 ml-2 text-lg">one-time</span>
        </div>

        {/* Benefits list */}
        <ul className="mt-8 space-y-3 text-left" aria-label="Benefits included">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-start gap-3">
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
            "mt-8 w-full py-4 px-6 rounded-lg font-semibold text-white text-lg",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
            // Minimum touch target
            "min-h-[48px]",
            isLoading
              ? "bg-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
          )}
          aria-label={`${ctaText} for ${formattedPrice}`}
          data-testid="paywall-cta"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon />
              Processing...
            </span>
          ) : (
            `${ctaText} - ${formattedPrice}`
          )}
        </button>

        {/* Mock mode indicator (for development) */}
        {mockMode && (
          <p className="mt-4 text-xs text-gray-400" data-testid="mock-mode-indicator">
            Demo mode: No payment required
          </p>
        )}
      </div>
    </div>
  );
}
