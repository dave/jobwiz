/**
 * PostHog Client
 * Issue: #43 - Conversion tracking events
 *
 * PostHog client initialization and configuration
 */

import posthog from "posthog-js";
import type { AnalyticsConfig } from "./types";

/** Singleton to track if PostHog has been initialized */
let isInitialized = false;

/**
 * Default PostHog configuration
 */
const defaultConfig: Partial<AnalyticsConfig> = {
  debug: process.env.NODE_ENV === "development",
  enabled: true,
};

/**
 * Get PostHog config from environment
 */
export function getPostHogConfig(): AnalyticsConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !apiHost) {
    return null;
  }

  return {
    apiKey,
    apiHost,
    ...defaultConfig,
  };
}

/**
 * Check if PostHog is configured (has required env vars)
 */
export function isPostHogConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
  );
}

/**
 * Check if PostHog has been initialized
 */
export function isPostHogInitialized(): boolean {
  return isInitialized;
}

/**
 * Initialize PostHog client
 * Safe to call multiple times - will only initialize once
 */
export function initPostHog(config?: Partial<AnalyticsConfig>): boolean {
  // Skip if already initialized
  if (isInitialized) {
    return true;
  }

  // Skip if running on server
  if (typeof window === "undefined") {
    return false;
  }

  // Get config from env or use provided config
  const envConfig = getPostHogConfig();
  const finalConfig = {
    ...envConfig,
    ...config,
  };

  // Skip if not configured
  if (!finalConfig.apiKey || !finalConfig.apiHost) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Analytics] PostHog not configured. Set NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST"
      );
    }
    return false;
  }

  // Skip if disabled
  if (finalConfig.enabled === false) {
    return false;
  }

  try {
    posthog.init(finalConfig.apiKey, {
      api_host: finalConfig.apiHost,
      // Capture page views automatically
      capture_pageview: false, // We'll handle this manually for more control
      // Capture page leaves automatically
      capture_pageleave: true,
      // Enable debug mode in development
      loaded: (ph) => {
        if (finalConfig.debug && process.env.NODE_ENV === "development") {
          ph.debug();
        }
      },
      // Disable persistence in tests
      persistence:
        process.env.NODE_ENV === "test" ? "memory" : "localStorage+cookie",
      // Bootstrap with distinct_id if available (for SSR)
      bootstrap: {},
    });

    isInitialized = true;
    return true;
  } catch (error) {
    console.error("[Analytics] Failed to initialize PostHog:", error);
    return false;
  }
}

/**
 * Get the PostHog client instance
 * Returns null if not initialized
 */
export function getPostHogClient(): typeof posthog | null {
  if (!isInitialized || typeof window === "undefined") {
    return null;
  }
  return posthog;
}

/**
 * Shutdown PostHog client
 * Call this when the app unmounts
 */
export function shutdownPostHog(): void {
  if (isInitialized && typeof window !== "undefined") {
    // PostHog doesn't have a shutdown method in types, but reset clears state
    posthog.reset();
    isInitialized = false;
  }
}

/**
 * Reset PostHog client (for testing)
 */
export function resetPostHog(): void {
  if (typeof window !== "undefined") {
    posthog.reset();
  }
  isInitialized = false;
}

/**
 * Get the current PostHog distinct_id
 */
export function getDistinctId(): string | null {
  if (!isInitialized || typeof window === "undefined") {
    return null;
  }
  return posthog.get_distinct_id() || null;
}
