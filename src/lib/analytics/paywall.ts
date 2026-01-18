/**
 * Paywall Analytics Integration
 * Issue: #43 - Conversion tracking events
 *
 * Helper functions to integrate PaywallGate with analytics tracking
 */

import type { PaywallTrackEvent } from "@/components/paywall/PaywallGate";
import {
  trackPaywallImpression,
  trackPaywallCTAClick,
  trackPaywallUnlock,
} from "./tracking";
import type { PaywallEventProperties } from "./types";

/**
 * Create an onTrack callback for PaywallGate
 * Maps PaywallGate events to PostHog analytics events
 */
export function createPaywallTracker(
  additionalProperties?: Partial<PaywallEventProperties>
): (event: PaywallTrackEvent) => void {
  return (event: PaywallTrackEvent) => {
    const baseProperties: PaywallEventProperties = {
      journey_id: event.journeyId,
      paywall_variant: event.variant,
      price: event.price,
      ...additionalProperties,
    };

    switch (event.eventType) {
      case "paywall_impression":
        trackPaywallImpression(baseProperties);
        break;

      case "paywall_cta_click":
        trackPaywallCTAClick(baseProperties);
        break;

      case "paywall_unlock":
        trackPaywallUnlock(baseProperties);
        break;
    }
  };
}

/**
 * Hook-style function to track paywall events
 * Can be used directly with PaywallGate onTrack prop
 */
export function trackPaywallEvent(
  event: PaywallTrackEvent,
  additionalProperties?: Partial<PaywallEventProperties>
): void {
  const tracker = createPaywallTracker(additionalProperties);
  tracker(event);
}
