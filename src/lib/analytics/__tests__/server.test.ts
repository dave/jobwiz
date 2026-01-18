/**
 * Server-side Analytics Tests
 * Issue: #43 - Conversion tracking events
 */

import {
  captureServerEvent,
  trackServerPurchaseCompleted,
  trackServerCheckoutStarted,
  identifyServer,
  aliasServer,
  isServerAnalyticsConfigured,
} from "../server";

// Mock fetch
global.fetch = jest.fn();

describe("Server Analytics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (fetch as jest.Mock).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isServerAnalyticsConfigured", () => {
    it("should return false when API key not set", () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      expect(isServerAnalyticsConfigured()).toBe(false);
    });

    it("should return true when API key is set", () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      expect(isServerAnalyticsConfigured()).toBe(true);
    });
  });

  describe("captureServerEvent", () => {
    it("should send event to PostHog capture API", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

      const result = await captureServerEvent("user_123", "test_event", {
        foo: "bar",
      });

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "https://app.posthog.com/capture/",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("test_event"),
        })
      );
    });

    it("should include distinct_id in request", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

      await captureServerEvent("distinct_user_id", "test_event", {});

      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.distinct_id).toBe("distinct_user_id");
    });

    it("should include timestamp in request", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";

      await captureServerEvent("user_123", "test_event", {});

      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });

    it("should return false when API key not set", async () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

      const result = await captureServerEvent("user_123", "test_event", {});

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return false on fetch error", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await captureServerEvent("user_123", "test_event", {});

      expect(result).toBe(false);
    });

    it("should return false on non-ok response", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const result = await captureServerEvent("user_123", "test_event", {});

      expect(result).toBe(false);
    });

    it("should use default host when not specified", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

      await captureServerEvent("user_123", "test_event", {});

      expect(fetch).toHaveBeenCalledWith(
        "https://app.posthog.com/capture/",
        expect.anything()
      );
    });
  });

  describe("trackServerPurchaseCompleted", () => {
    it("should track purchase completed event", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";

      await trackServerPurchaseCompleted("user_123", {
        product_id: "prod_123",
        amount: 20000,
        currency: "usd",
        company_slug: "google",
        role_slug: "software-engineer",
        variant: "freemium",
      });

      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.event).toBe("purchase_completed");
      expect(body.properties.amount).toBe(20000);
      expect(body.properties.product_id).toBe("prod_123");
      expect(body.properties.variant).toBe("freemium");
    });

    it("should set user variant property on purchase", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";

      await trackServerPurchaseCompleted("user_123", {
        amount: 20000,
        variant: "direct_paywall",
      });

      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.properties.$set).toEqual({
        paywall_variant: "direct_paywall",
      });
    });
  });

  describe("trackServerCheckoutStarted", () => {
    it("should track checkout started event", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";

      await trackServerCheckoutStarted("user_123", {
        product_id: "prod_123",
        company_slug: "google",
        role_slug: "software-engineer",
        amount: 20000,
        currency: "usd",
        experiment: "paywall_test",
        variant: "freemium",
      });

      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.event).toBe("checkout_started");
      expect(body.properties.company_slug).toBe("google");
      expect(body.properties.experiment).toBe("paywall_test");
    });
  });

  describe("identifyServer", () => {
    it("should send identify event", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";

      const result = await identifyServer("user_123", {
        target_company: "google",
        target_role: "software-engineer",
      });

      expect(result).toBe(true);

      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.event).toBe("$identify");
      expect(body.distinct_id).toBe("user_123");
      expect(body.$set.target_company).toBe("google");
    });

    it("should return false when not configured", async () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

      const result = await identifyServer("user_123", {});

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("aliasServer", () => {
    it("should send alias event", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";

      const result = await aliasServer("anonymous_123", "user_456");

      expect(result).toBe(true);

      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.event).toBe("$create_alias");
      expect(body.distinct_id).toBe("anonymous_123");
      expect(body.properties.alias).toBe("user_456");
    });

    it("should return false when not configured", async () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

      const result = await aliasServer("anonymous_123", "user_456");

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
