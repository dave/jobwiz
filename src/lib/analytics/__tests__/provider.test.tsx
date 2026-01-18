/**
 * Analytics Provider Tests
 * Issue: #43 - Conversion tracking events
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock the client module
jest.mock("../client", () => ({
  initPostHog: jest.fn(() => true),
  shutdownPostHog: jest.fn(),
  isPostHogInitialized: jest.fn(() => true),
}));

// Mock the tracking module
jest.mock("../tracking", () => ({
  trackPageView: jest.fn(),
  setExperimentContext: jest.fn(),
  setPositionContext: jest.fn(),
  captureUTMParameters: jest.fn(),
  trackEvent: jest.fn(),
  identify: jest.fn(),
  setUserProperties: jest.fn(),
  resetAnalytics: jest.fn(),
  getExperimentContext: jest.fn(() => ({ experiment: null, variant: null })),
  getPositionContext: jest.fn(() => ({
    companySlug: null,
    roleSlug: null,
  })),
}));

import { AnalyticsProvider, useAnalytics, useAnalyticsSafe } from "../provider";
import { initPostHog, shutdownPostHog } from "../client";
import {
  trackPageView,
  setExperimentContext,
  captureUTMParameters,
  resetAnalytics,
} from "../tracking";

// Helper component to test the hook
function TestComponent() {
  const analytics = useAnalytics();
  return (
    <div>
      <span data-testid="ready">{analytics.isReady.toString()}</span>
      <button onClick={() => analytics.trackEvent("page_view", {})}>
        Track
      </button>
      <button onClick={() => analytics.identify("user_123", {})}>
        Identify
      </button>
      <button onClick={() => analytics.reset()}>Reset</button>
      <button onClick={() => analytics.setExperiment("test", "variant")}>
        Set Experiment
      </button>
    </div>
  );
}

// Helper component to test safe hook
function SafeTestComponent() {
  const analytics = useAnalyticsSafe();
  return <span data-testid="hasSafe">{(analytics !== null).toString()}</span>;
}

describe("AnalyticsProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize PostHog on mount", () => {
    render(
      <AnalyticsProvider>
        <div>Test</div>
      </AnalyticsProvider>
    );

    expect(initPostHog).toHaveBeenCalled();
  });

  it("should shutdown PostHog on unmount", () => {
    const { unmount } = render(
      <AnalyticsProvider>
        <div>Test</div>
      </AnalyticsProvider>
    );

    unmount();
    expect(shutdownPostHog).toHaveBeenCalled();
  });

  it("should set experiment context with initial props", () => {
    render(
      <AnalyticsProvider
        initialExperiment="paywall_test"
        initialVariant="freemium"
      >
        <div>Test</div>
      </AnalyticsProvider>
    );

    expect(setExperimentContext).toHaveBeenCalledWith(
      "paywall_test",
      "freemium"
    );
  });

  it("should capture UTM parameters on mount", () => {
    render(
      <AnalyticsProvider>
        <div>Test</div>
      </AnalyticsProvider>
    );

    expect(captureUTMParameters).toHaveBeenCalled();
  });

  it("should track page view on mount", async () => {
    render(
      <AnalyticsProvider>
        <div>Test</div>
      </AnalyticsProvider>
    );

    // Wait for useEffect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(trackPageView).toHaveBeenCalled();
  });
});

describe("useAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw when used outside provider", () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useAnalytics must be used within an AnalyticsProvider");

    console.error = consoleError;
  });

  it("should provide isReady state", async () => {
    render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId("ready")).toHaveTextContent("true");
  });

  it("should provide trackEvent function", () => {
    render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>
    );

    const trackButton = screen.getByText("Track");
    expect(trackButton).toBeInTheDocument();
  });

  it("should provide identify function", () => {
    render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>
    );

    const identifyButton = screen.getByText("Identify");
    expect(identifyButton).toBeInTheDocument();
  });

  it("should provide reset function", async () => {
    const { getByText } = render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>
    );

    await act(async () => {
      getByText("Reset").click();
    });

    expect(resetAnalytics).toHaveBeenCalled();
  });

  it("should provide setExperiment function", async () => {
    const { getByText } = render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>
    );

    await act(async () => {
      getByText("Set Experiment").click();
    });

    expect(setExperimentContext).toHaveBeenCalledWith("test", "variant");
  });
});

describe("useAnalyticsSafe", () => {
  it("should return null when used outside provider", () => {
    render(<SafeTestComponent />);
    expect(screen.getByTestId("hasSafe")).toHaveTextContent("false");
  });

  it("should return context when used inside provider", () => {
    render(
      <AnalyticsProvider>
        <SafeTestComponent />
      </AnalyticsProvider>
    );
    expect(screen.getByTestId("hasSafe")).toHaveTextContent("true");
  });
});
