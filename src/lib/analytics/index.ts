/**
 * Analytics Module
 * Issue: #43 - Conversion tracking events
 *
 * PostHog analytics integration for conversion tracking
 */

// Types
export type {
  EventName,
  EventProperties,
  BaseEventProperties,
  PageViewProperties,
  CTAClickProperties,
  CheckoutStartedProperties,
  PurchaseCompletedProperties,
  PaywallEventProperties,
  JourneyStepProperties,
  AuthEventProperties,
  UserProperties,
  AnalyticsConfig,
  TrackEventFn,
  IdentifyFn,
  ServerPurchaseEvent,
} from "./types";

// Client
export {
  initPostHog,
  shutdownPostHog,
  resetPostHog,
  getPostHogClient,
  getPostHogConfig,
  isPostHogConfigured,
  isPostHogInitialized,
  getDistinctId,
} from "./client";

// Tracking
export {
  trackEvent,
  trackPageView,
  trackCTAClick,
  trackCheckoutStarted,
  trackPurchaseCompleted,
  trackPaywallImpression,
  trackPaywallCTAClick,
  trackPaywallUnlock,
  trackJourneyStepComplete,
  trackAuthStarted,
  trackAuthComplete,
  identify,
  setUserProperties,
  setUserPropertiesOnce,
  resetAnalytics,
  captureUTMParameters,
  setExperimentContext,
  setPositionContext,
  getExperimentContext,
  getPositionContext,
} from "./tracking";

// Provider
export { AnalyticsProvider, useAnalytics, useAnalyticsSafe } from "./provider";

// Paywall Integration
export { createPaywallTracker, trackPaywallEvent } from "./paywall";

// Server-side
export {
  captureServerEvent,
  trackServerPurchaseCompleted,
  trackServerCheckoutStarted,
  identifyServer,
  aliasServer,
  isServerAnalyticsConfigured,
} from "./server";
