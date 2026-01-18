/**
 * Event Tracking Tests
 * Issue: #43 - Conversion tracking events
 */

import posthog from "posthog-js";

// Mock posthog-js
jest.mock("posthog-js", () => ({
  capture: jest.fn(),
  identify: jest.fn(),
  people: {
    set: jest.fn(),
    set_once: jest.fn(),
  },
  reset: jest.fn(),
}));

// Mock the client module
jest.mock("../client", () => ({
  isPostHogInitialized: jest.fn(() => true),
  initPostHog: jest.fn(() => true),
}));

import {
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
} from "../tracking";
import { isPostHogInitialized } from "../client";

describe("Event Tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isPostHogInitialized as jest.Mock).mockReturnValue(true);
    // Reset context
    setExperimentContext(null, null);
    setPositionContext(null, null);
  });

  describe("setExperimentContext", () => {
    it("should set experiment and variant", () => {
      setExperimentContext("paywall_test", "freemium");
      const context = getExperimentContext();
      expect(context.experiment).toBe("paywall_test");
      expect(context.variant).toBe("freemium");
    });

    it("should clear context when set to null", () => {
      setExperimentContext("paywall_test", "freemium");
      setExperimentContext(null, null);
      const context = getExperimentContext();
      expect(context.experiment).toBeNull();
      expect(context.variant).toBeNull();
    });
  });

  describe("setPositionContext", () => {
    it("should set company and role", () => {
      setPositionContext("google", "software-engineer");
      const context = getPositionContext();
      expect(context.companySlug).toBe("google");
      expect(context.roleSlug).toBe("software-engineer");
    });
  });

  describe("trackEvent", () => {
    it("should capture event with PostHog", () => {
      trackEvent("page_view", { path: "/" });
      expect(posthog.capture).toHaveBeenCalledWith(
        "page_view",
        expect.objectContaining({
          path: "/",
          timestamp: expect.any(String),
        })
      );
    });

    it("should include experiment context in events", () => {
      setExperimentContext("paywall_test", "freemium");
      trackEvent("page_view", { path: "/" });
      expect(posthog.capture).toHaveBeenCalledWith(
        "page_view",
        expect.objectContaining({
          experiment: "paywall_test",
          variant: "freemium",
          $set: { paywall_variant: "freemium" },
        })
      );
    });

    it("should include position context in events", () => {
      setPositionContext("google", "software-engineer");
      trackEvent("page_view", {});
      expect(posthog.capture).toHaveBeenCalledWith(
        "page_view",
        expect.objectContaining({
          company_slug: "google",
          role_slug: "software-engineer",
        })
      );
    });

    it("should not override provided company/role", () => {
      setPositionContext("google", "software-engineer");
      trackEvent("page_view", {
        company_slug: "meta",
        role_slug: "product-manager",
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "page_view",
        expect.objectContaining({
          company_slug: "meta",
          role_slug: "product-manager",
        })
      );
    });

    it("should not call capture when PostHog not initialized", () => {
      (isPostHogInitialized as jest.Mock).mockReturnValue(false);
      trackEvent("page_view", { path: "/" });
      expect(posthog.capture).not.toHaveBeenCalled();
    });
  });

  describe("trackPageView", () => {
    it("should track page view with provided path", () => {
      trackPageView({ path: "/test" });
      expect(posthog.capture).toHaveBeenCalledWith(
        "page_view",
        expect.objectContaining({
          path: "/test",
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe("trackCTAClick", () => {
    it("should track CTA click with button details", () => {
      trackCTAClick({
        button_id: "cta-unlock",
        button_text: "Unlock Now",
        location: "hero",
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "cta_click",
        expect.objectContaining({
          button_id: "cta-unlock",
          button_text: "Unlock Now",
          location: "hero",
        })
      );
    });
  });

  describe("trackCheckoutStarted", () => {
    it("should track checkout with product details", () => {
      trackCheckoutStarted({
        product_id: "prod_123",
        amount: 20000,
        currency: "usd",
        company_slug: "google",
        role_slug: "software-engineer",
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "checkout_started",
        expect.objectContaining({
          product_id: "prod_123",
          amount: 20000,
          currency: "usd",
        })
      );
    });
  });

  describe("trackPurchaseCompleted", () => {
    it("should track purchase with all details", () => {
      trackPurchaseCompleted({
        product_id: "prod_123",
        amount: 20000,
        currency: "usd",
        stripe_session_id: "cs_test_123",
        user_id: "user_123",
        company_slug: "google",
        role_slug: "software-engineer",
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "purchase_completed",
        expect.objectContaining({
          amount: 20000,
          stripe_session_id: "cs_test_123",
          user_id: "user_123",
        })
      );
    });

    it("should include variant in purchase event", () => {
      setExperimentContext("paywall_test", "direct_paywall");
      trackPurchaseCompleted({
        amount: 20000,
        company_slug: "google",
        role_slug: "software-engineer",
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "purchase_completed",
        expect.objectContaining({
          experiment: "paywall_test",
          variant: "direct_paywall",
          $set: { paywall_variant: "direct_paywall" },
        })
      );
    });
  });

  describe("trackPaywallImpression", () => {
    it("should track paywall impression", () => {
      trackPaywallImpression({
        journey_id: "journey_123",
        paywall_variant: "hard",
        price: 200,
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "paywall_impression",
        expect.objectContaining({
          journey_id: "journey_123",
          paywall_variant: "hard",
          price: 200,
        })
      );
    });
  });

  describe("trackPaywallCTAClick", () => {
    it("should track paywall CTA click", () => {
      trackPaywallCTAClick({
        journey_id: "journey_123",
        paywall_variant: "soft",
        price: 200,
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "paywall_cta_click",
        expect.objectContaining({
          paywall_variant: "soft",
        })
      );
    });
  });

  describe("trackPaywallUnlock", () => {
    it("should track paywall unlock", () => {
      trackPaywallUnlock({
        journey_id: "journey_123",
        paywall_variant: "teaser",
        price: 200,
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "paywall_unlock",
        expect.objectContaining({
          paywall_variant: "teaser",
        })
      );
    });
  });

  describe("trackJourneyStepComplete", () => {
    it("should track journey step completion", () => {
      trackJourneyStepComplete({
        journey_id: "journey_123",
        step_index: 2,
        step_id: "step_abc",
        total_steps: 10,
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "journey_step_complete",
        expect.objectContaining({
          step_index: 2,
          step_id: "step_abc",
          total_steps: 10,
        })
      );
    });
  });

  describe("trackAuthStarted", () => {
    it("should track auth started", () => {
      trackAuthStarted({
        method: "google",
        trigger: "paywall",
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "auth_started",
        expect.objectContaining({
          method: "google",
          trigger: "paywall",
        })
      );
    });
  });

  describe("trackAuthComplete", () => {
    it("should track auth complete", () => {
      trackAuthComplete({
        method: "email",
        trigger: "direct",
      });
      expect(posthog.capture).toHaveBeenCalledWith(
        "auth_complete",
        expect.objectContaining({
          method: "email",
          trigger: "direct",
        })
      );
    });
  });

  describe("identify", () => {
    it("should identify user with PostHog", () => {
      identify("user_123", {
        target_company: "google",
        target_role: "software-engineer",
      });
      expect(posthog.identify).toHaveBeenCalledWith("user_123", {
        target_company: "google",
        target_role: "software-engineer",
      });
    });

    it("should include variant in user properties", () => {
      setExperimentContext("paywall_test", "freemium");
      identify("user_123", {
        target_company: "google",
      });
      expect(posthog.identify).toHaveBeenCalledWith("user_123", {
        target_company: "google",
        paywall_variant: "freemium",
      });
    });

    it("should not call identify when PostHog not initialized", () => {
      (isPostHogInitialized as jest.Mock).mockReturnValue(false);
      identify("user_123", {});
      expect(posthog.identify).not.toHaveBeenCalled();
    });
  });

  describe("setUserProperties", () => {
    it("should set user properties", () => {
      setUserProperties({
        target_company: "meta",
        target_role: "product-manager",
      });
      expect(posthog.people.set).toHaveBeenCalledWith({
        target_company: "meta",
        target_role: "product-manager",
      });
    });
  });

  describe("setUserPropertiesOnce", () => {
    it("should set user properties once", () => {
      setUserPropertiesOnce({
        utm_source: "google",
        utm_medium: "cpc",
      });
      expect(posthog.people.set_once).toHaveBeenCalledWith({
        utm_source: "google",
        utm_medium: "cpc",
      });
    });
  });

  describe("resetAnalytics", () => {
    it("should reset PostHog and clear context", () => {
      setExperimentContext("paywall_test", "freemium");
      resetAnalytics();
      expect(posthog.reset).toHaveBeenCalled();
      const context = getExperimentContext();
      expect(context.experiment).toBeNull();
      expect(context.variant).toBeNull();
    });
  });

  describe("captureUTMParameters", () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Reset mocks for this test
      (posthog.people.set_once as jest.Mock).mockClear();
    });

    afterEach(() => {
      // Restore original location
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it("should capture UTM params from URL", () => {
      // Mock window.location.search
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          search: "?utm_source=google&utm_medium=cpc&utm_campaign=test",
        },
        writable: true,
        configurable: true,
      });

      captureUTMParameters();
      expect(posthog.people.set_once).toHaveBeenCalledWith({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "test",
      });
    });

    it("should not set properties when no UTM params", () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          search: "",
        },
        writable: true,
        configurable: true,
      });

      captureUTMParameters();
      expect(posthog.people.set_once).not.toHaveBeenCalled();
    });

    it("should handle partial UTM params", () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          search: "?utm_source=google",
        },
        writable: true,
        configurable: true,
      });

      captureUTMParameters();
      expect(posthog.people.set_once).toHaveBeenCalledWith({
        utm_source: "google",
      });
    });
  });
});
