/**
 * PostHog Client Tests
 * Issue: #43 - Conversion tracking events
 */

// We need to test module-level state (isInitialized), which requires fresh imports
// Since the client module has module-level singleton state, we test behavior patterns

describe("PostHog Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getPostHogConfig", () => {
    it("should return null when env vars are not set", () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

      const { getPostHogConfig } = require("../client");
      const config = getPostHogConfig();
      expect(config).toBeNull();
    });

    it("should return config when env vars are set", () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

      const { getPostHogConfig } = require("../client");
      const config = getPostHogConfig();
      expect(config).toEqual({
        apiKey: "phc_test_key",
        apiHost: "https://app.posthog.com",
        debug: false, // NODE_ENV is "test", not "development"
        enabled: true,
      });
    });
  });

  describe("isPostHogConfigured", () => {
    it("should return false when not configured", () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

      const { isPostHogConfigured } = require("../client");
      expect(isPostHogConfigured()).toBe(false);
    });

    it("should return true when configured", () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

      const { isPostHogConfigured } = require("../client");
      expect(isPostHogConfigured()).toBe(true);
    });
  });

  describe("initPostHog", () => {
    it("should return false when env vars are not set", () => {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

      const { initPostHog } = require("../client");
      const result = initPostHog();
      expect(result).toBe(false);
    });

    it("should return false when disabled", () => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

      const { initPostHog } = require("../client");
      const result = initPostHog({ enabled: false });
      expect(result).toBe(false);
    });
  });

  describe("isPostHogInitialized", () => {
    it("should return false before initialization", () => {
      const { isPostHogInitialized } = require("../client");
      expect(isPostHogInitialized()).toBe(false);
    });
  });

  describe("getPostHogClient", () => {
    it("should return null when not initialized", () => {
      const { getPostHogClient } = require("../client");
      expect(getPostHogClient()).toBeNull();
    });
  });

  describe("getDistinctId", () => {
    it("should return null when not initialized", () => {
      const { getDistinctId } = require("../client");
      expect(getDistinctId()).toBeNull();
    });
  });
});

describe("PostHog Client with mock", () => {
  beforeEach(() => {
    jest.resetModules();
    // Mock posthog-js
    jest.doMock("posthog-js", () => ({
      init: jest.fn(),
      reset: jest.fn(),
      get_distinct_id: jest.fn(() => "test_user_123"),
      debug: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock("posthog-js");
  });

  it("should initialize when env vars are set", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

    const posthog = require("posthog-js");
    const { initPostHog, isPostHogInitialized } = require("../client");

    const result = initPostHog();
    expect(result).toBe(true);
    expect(isPostHogInitialized()).toBe(true);
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({
        api_host: "https://app.posthog.com",
        capture_pageview: false,
        capture_pageleave: true,
      })
    );
  });

  it("should only initialize once", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

    const posthog = require("posthog-js");
    const { initPostHog } = require("../client");

    initPostHog();
    initPostHog();
    initPostHog();
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it("should return client when initialized", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

    const posthog = require("posthog-js");
    const { initPostHog, getPostHogClient } = require("../client");

    initPostHog();
    const client = getPostHogClient();
    expect(client).toBe(posthog);
  });

  it("should return distinct_id when initialized", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

    const { initPostHog, getDistinctId } = require("../client");

    initPostHog();
    expect(getDistinctId()).toBe("test_user_123");
  });

  it("should call reset on shutdown", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

    const posthog = require("posthog-js");
    const { initPostHog, shutdownPostHog, isPostHogInitialized } =
      require("../client");

    initPostHog();
    expect(isPostHogInitialized()).toBe(true);
    shutdownPostHog();
    expect(posthog.reset).toHaveBeenCalled();
    expect(isPostHogInitialized()).toBe(false);
  });

  it("should call reset on resetPostHog", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";

    const posthog = require("posthog-js");
    const { initPostHog, resetPostHog } = require("../client");

    initPostHog();
    resetPostHog();
    expect(posthog.reset).toHaveBeenCalled();
  });
});
