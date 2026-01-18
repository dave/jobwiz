/**
 * Event Tracking
 * Issue: #43 - Conversion tracking events
 *
 * Wrapper functions for tracking events with automatic variant injection
 */

import posthog from "posthog-js";
import type {
  EventName,
  EventProperties,
  UserProperties,
  PageViewProperties,
  CTAClickProperties,
  CheckoutStartedProperties,
  PurchaseCompletedProperties,
  PaywallEventProperties,
  JourneyStepProperties,
  AuthEventProperties,
} from "./types";
import { isPostHogInitialized } from "./client";

/** Current experiment context - set by the AnalyticsProvider */
let currentExperiment: string | null = null;
let currentVariant: string | null = null;
let currentCompanySlug: string | null = null;
let currentRoleSlug: string | null = null;

/**
 * Set the current experiment context
 * This will be automatically added to all tracked events
 */
export function setExperimentContext(
  experiment: string | null,
  variant: string | null
): void {
  currentExperiment = experiment;
  currentVariant = variant;
}

/**
 * Set the current position context (company/role)
 */
export function setPositionContext(
  companySlug: string | null,
  roleSlug: string | null
): void {
  currentCompanySlug = companySlug;
  currentRoleSlug = roleSlug;
}

/**
 * Get current experiment context
 */
export function getExperimentContext(): {
  experiment: string | null;
  variant: string | null;
} {
  return { experiment: currentExperiment, variant: currentVariant };
}

/**
 * Get current position context
 */
export function getPositionContext(): {
  companySlug: string | null;
  roleSlug: string | null;
} {
  return { companySlug: currentCompanySlug, roleSlug: currentRoleSlug };
}

/**
 * Enrich event properties with experiment and position context
 */
function enrichProperties(properties?: EventProperties): EventProperties {
  const enriched: EventProperties = {
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    ...properties,
  };

  // Add experiment context if set
  if (currentExperiment) {
    enriched.experiment = currentExperiment;
  }
  if (currentVariant) {
    enriched.variant = currentVariant;
  }

  // Add position context if set and not already provided
  if (currentCompanySlug && !enriched.company_slug) {
    enriched.company_slug = currentCompanySlug;
  }
  if (currentRoleSlug && !enriched.role_slug) {
    enriched.role_slug = currentRoleSlug;
  }

  return enriched;
}

/**
 * Main tracking function
 * Automatically enriches properties with experiment variant
 */
export function trackEvent(
  eventName: EventName,
  properties?: EventProperties
): void {
  // Skip if PostHog not initialized
  if (!isPostHogInitialized() || typeof window === "undefined") {
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] Event (not sent):", eventName, properties);
    }
    return;
  }

  const enrichedProperties = enrichProperties(properties);

  // Also set variant as a user property for easier filtering
  if (currentVariant) {
    posthog.capture(eventName, {
      ...enrichedProperties,
      $set: {
        paywall_variant: currentVariant,
      },
    });
  } else {
    posthog.capture(eventName, enrichedProperties);
  }
}

/**
 * Track page view event
 */
export function trackPageView(properties?: PageViewProperties): void {
  const pageProps: PageViewProperties = {
    title: typeof document !== "undefined" ? document.title : undefined,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
    ...properties,
  };

  trackEvent("page_view", pageProps);
}

/**
 * Track CTA click event
 */
export function trackCTAClick(properties: CTAClickProperties): void {
  trackEvent("cta_click", properties);
}

/**
 * Track checkout started event
 */
export function trackCheckoutStarted(
  properties: CheckoutStartedProperties
): void {
  trackEvent("checkout_started", properties);
}

/**
 * Track purchase completed event
 */
export function trackPurchaseCompleted(
  properties: PurchaseCompletedProperties
): void {
  trackEvent("purchase_completed", properties);
}

/**
 * Track paywall impression event
 */
export function trackPaywallImpression(
  properties: PaywallEventProperties
): void {
  trackEvent("paywall_impression", properties);
}

/**
 * Track paywall CTA click event
 */
export function trackPaywallCTAClick(properties: PaywallEventProperties): void {
  trackEvent("paywall_cta_click", properties);
}

/**
 * Track paywall unlock event
 */
export function trackPaywallUnlock(properties: PaywallEventProperties): void {
  trackEvent("paywall_unlock", properties);
}

/**
 * Track journey step completion event
 */
export function trackJourneyStepComplete(
  properties: JourneyStepProperties
): void {
  trackEvent("journey_step_complete", properties);
}

/**
 * Track auth started event
 */
export function trackAuthStarted(properties: AuthEventProperties): void {
  trackEvent("auth_started", properties);
}

/**
 * Track auth completed event
 */
export function trackAuthComplete(properties: AuthEventProperties): void {
  trackEvent("auth_complete", properties);
}

/**
 * Identify a user in PostHog
 * Call this when a user logs in
 */
export function identify(userId: string, properties?: UserProperties): void {
  if (!isPostHogInitialized() || typeof window === "undefined") {
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] Identify (not sent):", userId, properties);
    }
    return;
  }

  // Add variant to user properties if set
  const userProps: UserProperties = {
    ...properties,
  };

  if (currentVariant) {
    userProps.paywall_variant = currentVariant;
  }

  posthog.identify(userId, userProps);
}

/**
 * Set user properties without identifying
 */
export function setUserProperties(properties: UserProperties): void {
  if (!isPostHogInitialized() || typeof window === "undefined") {
    return;
  }

  posthog.people.set(properties);
}

/**
 * Set user properties only once (first time only)
 * Use for UTM parameters to not overwrite on subsequent visits
 */
export function setUserPropertiesOnce(properties: UserProperties): void {
  if (!isPostHogInitialized() || typeof window === "undefined") {
    return;
  }

  posthog.people.set_once(properties);
}

/**
 * Reset analytics on logout
 */
export function resetAnalytics(): void {
  if (!isPostHogInitialized() || typeof window === "undefined") {
    return;
  }

  posthog.reset();
  currentExperiment = null;
  currentVariant = null;
}

/**
 * Capture UTM parameters from URL
 * Should be called on first page load
 */
export function captureUTMParameters(): void {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");

  if (utmSource || utmMedium || utmCampaign) {
    const utmProps: UserProperties = {};

    if (utmSource) utmProps.utm_source = utmSource;
    if (utmMedium) utmProps.utm_medium = utmMedium;
    if (utmCampaign) utmProps.utm_campaign = utmCampaign;

    // Use set_once to not overwrite on subsequent visits
    setUserPropertiesOnce(utmProps);
  }
}
