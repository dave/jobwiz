"use client";

/**
 * Analytics Provider
 * Issue: #43 - Conversion tracking events
 *
 * React provider component for PostHog analytics
 */

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { EventName, EventProperties, UserProperties } from "./types";
import {
  initPostHog,
  shutdownPostHog,
  isPostHogInitialized,
} from "./client";
import {
  trackEvent,
  trackPageView,
  identify,
  setUserProperties,
  resetAnalytics,
  setExperimentContext,
  setPositionContext,
  captureUTMParameters,
  getExperimentContext,
  getPositionContext,
} from "./tracking";

/**
 * Analytics context value
 */
interface AnalyticsContextValue {
  /** Track a custom event */
  trackEvent: (eventName: EventName, properties?: EventProperties) => void;
  /** Track a page view */
  trackPageView: (properties?: EventProperties) => void;
  /** Identify a user */
  identify: (userId: string, properties?: UserProperties) => void;
  /** Set user properties */
  setUserProperties: (properties: UserProperties) => void;
  /** Reset analytics (on logout) */
  reset: () => void;
  /** Set experiment context */
  setExperiment: (experiment: string | null, variant: string | null) => void;
  /** Set position context */
  setPosition: (companySlug: string | null, roleSlug: string | null) => void;
  /** Get current experiment context */
  getExperiment: () => { experiment: string | null; variant: string | null };
  /** Get current position context */
  getPosition: () => { companySlug: string | null; roleSlug: string | null };
  /** Whether analytics is ready */
  isReady: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

interface AnalyticsProviderProps {
  children: ReactNode;
  /** Initial experiment (from AB testing) */
  initialExperiment?: string;
  /** Initial variant (from AB testing) */
  initialVariant?: string;
}

/**
 * Analytics provider component
 * Initializes PostHog and provides tracking context
 */
export function AnalyticsProvider({
  children,
  initialExperiment,
  initialVariant,
}: AnalyticsProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount
  useEffect(() => {
    const initialized = initPostHog();
    setIsReady(initialized || !isPostHogInitialized());

    // Set initial experiment context if provided
    if (initialExperiment && initialVariant) {
      setExperimentContext(initialExperiment, initialVariant);
    }

    // Capture UTM parameters on first load
    captureUTMParameters();

    // Cleanup on unmount
    return () => {
      shutdownPostHog();
    };
  }, [initialExperiment, initialVariant]);

  // Track page views on route change
  useEffect(() => {
    if (!isReady) return;

    // Extract company/role from pathname if present
    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      // Could be /company/role path
      setPositionContext(pathParts[0] || null, pathParts[1] || null);
    }

    trackPageView({
      path: pathname,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }, [pathname, searchParams, isReady]);

  // Context methods
  const handleSetExperiment = useCallback(
    (experiment: string | null, variant: string | null) => {
      setExperimentContext(experiment, variant);
    },
    []
  );

  const handleSetPosition = useCallback(
    (companySlug: string | null, roleSlug: string | null) => {
      setPositionContext(companySlug, roleSlug);
    },
    []
  );

  const handleReset = useCallback(() => {
    resetAnalytics();
  }, []);

  const value: AnalyticsContextValue = {
    trackEvent,
    trackPageView,
    identify,
    setUserProperties,
    reset: handleReset,
    setExperiment: handleSetExperiment,
    setPosition: handleSetPosition,
    getExperiment: getExperimentContext,
    getPosition: getPositionContext,
    isReady,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

/**
 * Hook to access analytics context
 */
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}

/**
 * Hook to access analytics context (safe version)
 * Returns null if not within provider instead of throwing
 */
export function useAnalyticsSafe(): AnalyticsContextValue | null {
  return useContext(AnalyticsContext);
}
