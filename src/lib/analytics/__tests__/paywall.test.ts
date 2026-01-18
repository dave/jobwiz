/**
 * Paywall Analytics Integration Tests
 * Issue: #43 - Conversion tracking events
 */

import type { PaywallTrackEvent } from "@/components/paywall/PaywallGate";
import { createPaywallTracker, trackPaywallEvent } from "../paywall";

// Mock the tracking module
jest.mock("../tracking", () => ({
  trackPaywallImpression: jest.fn(),
  trackPaywallCTAClick: jest.fn(),
  trackPaywallUnlock: jest.fn(),
}));

import {
  trackPaywallImpression,
  trackPaywallCTAClick,
  trackPaywallUnlock,
} from "../tracking";

describe("Paywall Analytics Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createPaywallTracker", () => {
    it("should create a tracker function", () => {
      const tracker = createPaywallTracker();
      expect(typeof tracker).toBe("function");
    });

    it("should track paywall_impression events", () => {
      const tracker = createPaywallTracker();
      const event: PaywallTrackEvent = {
        eventType: "paywall_impression",
        journeyId: "journey_123",
        variant: "hard",
        price: 200,
        timestamp: Date.now(),
      };

      tracker(event);

      expect(trackPaywallImpression).toHaveBeenCalledWith({
        journey_id: "journey_123",
        paywall_variant: "hard",
        price: 200,
      });
    });

    it("should track paywall_cta_click events", () => {
      const tracker = createPaywallTracker();
      const event: PaywallTrackEvent = {
        eventType: "paywall_cta_click",
        journeyId: "journey_456",
        variant: "soft",
        price: 150,
        timestamp: Date.now(),
      };

      tracker(event);

      expect(trackPaywallCTAClick).toHaveBeenCalledWith({
        journey_id: "journey_456",
        paywall_variant: "soft",
        price: 150,
      });
    });

    it("should track paywall_unlock events", () => {
      const tracker = createPaywallTracker();
      const event: PaywallTrackEvent = {
        eventType: "paywall_unlock",
        journeyId: "journey_789",
        variant: "teaser",
        price: 100,
        timestamp: Date.now(),
      };

      tracker(event);

      expect(trackPaywallUnlock).toHaveBeenCalledWith({
        journey_id: "journey_789",
        paywall_variant: "teaser",
        price: 100,
      });
    });

    it("should include additional properties", () => {
      const tracker = createPaywallTracker({
        company_slug: "google",
        role_slug: "software-engineer",
      });
      const event: PaywallTrackEvent = {
        eventType: "paywall_impression",
        journeyId: "journey_123",
        variant: "hard",
        price: 200,
        timestamp: Date.now(),
      };

      tracker(event);

      expect(trackPaywallImpression).toHaveBeenCalledWith({
        journey_id: "journey_123",
        paywall_variant: "hard",
        price: 200,
        company_slug: "google",
        role_slug: "software-engineer",
      });
    });
  });

  describe("trackPaywallEvent", () => {
    it("should track paywall events directly", () => {
      const event: PaywallTrackEvent = {
        eventType: "paywall_impression",
        journeyId: "journey_123",
        variant: "hard",
        price: 200,
        timestamp: Date.now(),
      };

      trackPaywallEvent(event);

      expect(trackPaywallImpression).toHaveBeenCalledWith({
        journey_id: "journey_123",
        paywall_variant: "hard",
        price: 200,
      });
    });

    it("should pass additional properties", () => {
      const event: PaywallTrackEvent = {
        eventType: "paywall_cta_click",
        journeyId: "journey_456",
        variant: "soft",
        price: 150,
        timestamp: Date.now(),
      };

      trackPaywallEvent(event, {
        company_slug: "meta",
        role_slug: "product-manager",
      });

      expect(trackPaywallCTAClick).toHaveBeenCalledWith({
        journey_id: "journey_456",
        paywall_variant: "soft",
        price: 150,
        company_slug: "meta",
        role_slug: "product-manager",
      });
    });

    it("should handle all event types", () => {
      const events: PaywallTrackEvent[] = [
        {
          eventType: "paywall_impression",
          journeyId: "j1",
          variant: "hard",
          price: 100,
          timestamp: Date.now(),
        },
        {
          eventType: "paywall_cta_click",
          journeyId: "j2",
          variant: "soft",
          price: 150,
          timestamp: Date.now(),
        },
        {
          eventType: "paywall_unlock",
          journeyId: "j3",
          variant: "teaser",
          price: 200,
          timestamp: Date.now(),
        },
      ];

      events.forEach((event) => trackPaywallEvent(event));

      expect(trackPaywallImpression).toHaveBeenCalledTimes(1);
      expect(trackPaywallCTAClick).toHaveBeenCalledTimes(1);
      expect(trackPaywallUnlock).toHaveBeenCalledTimes(1);
    });
  });
});
