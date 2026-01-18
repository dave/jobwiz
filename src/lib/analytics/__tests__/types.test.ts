/**
 * Analytics Types Tests
 * Issue: #43 - Conversion tracking events
 */

import type {
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
  ServerPurchaseEvent,
} from "../types";

describe("Analytics Types", () => {
  describe("EventName", () => {
    it("should accept valid event names", () => {
      const pageView: EventName = "page_view";
      const ctaClick: EventName = "cta_click";
      const checkoutStarted: EventName = "checkout_started";
      const purchaseCompleted: EventName = "purchase_completed";
      const paywallImpression: EventName = "paywall_impression";
      const paywallCtaClick: EventName = "paywall_cta_click";
      const paywallUnlock: EventName = "paywall_unlock";
      const journeyStepComplete: EventName = "journey_step_complete";
      const authStarted: EventName = "auth_started";
      const authComplete: EventName = "auth_complete";

      expect(pageView).toBe("page_view");
      expect(ctaClick).toBe("cta_click");
      expect(checkoutStarted).toBe("checkout_started");
      expect(purchaseCompleted).toBe("purchase_completed");
      expect(paywallImpression).toBe("paywall_impression");
      expect(paywallCtaClick).toBe("paywall_cta_click");
      expect(paywallUnlock).toBe("paywall_unlock");
      expect(journeyStepComplete).toBe("journey_step_complete");
      expect(authStarted).toBe("auth_started");
      expect(authComplete).toBe("auth_complete");
    });
  });

  describe("BaseEventProperties", () => {
    it("should have all base properties optional", () => {
      const props: BaseEventProperties = {};
      expect(props).toEqual({});
    });

    it("should accept all base properties", () => {
      const props: BaseEventProperties = {
        experiment: "paywall_test",
        variant: "freemium",
        company_slug: "google",
        role_slug: "software-engineer",
        url: "https://example.com/page",
        timestamp: "2024-01-15T10:30:00Z",
      };

      expect(props.experiment).toBe("paywall_test");
      expect(props.variant).toBe("freemium");
      expect(props.company_slug).toBe("google");
      expect(props.role_slug).toBe("software-engineer");
    });
  });

  describe("PageViewProperties", () => {
    it("should extend base properties", () => {
      const props: PageViewProperties = {
        experiment: "test",
        variant: "control",
        title: "Home Page",
        path: "/",
        referrer: "https://google.com",
      };

      expect(props.title).toBe("Home Page");
      expect(props.path).toBe("/");
      expect(props.referrer).toBe("https://google.com");
      expect(props.experiment).toBe("test");
    });
  });

  describe("CTAClickProperties", () => {
    it("should include button details", () => {
      const props: CTAClickProperties = {
        button_id: "cta-unlock",
        button_text: "Unlock Now",
        location: "hero",
        experiment: "paywall_test",
        variant: "direct_paywall",
      };

      expect(props.button_id).toBe("cta-unlock");
      expect(props.button_text).toBe("Unlock Now");
      expect(props.location).toBe("hero");
    });
  });

  describe("CheckoutStartedProperties", () => {
    it("should include product and amount details", () => {
      const props: CheckoutStartedProperties = {
        product_id: "prod_123",
        amount: 20000,
        currency: "usd",
        company_slug: "google",
        role_slug: "software-engineer",
        experiment: "paywall_test",
        variant: "freemium",
      };

      expect(props.product_id).toBe("prod_123");
      expect(props.amount).toBe(20000);
      expect(props.currency).toBe("usd");
    });
  });

  describe("PurchaseCompletedProperties", () => {
    it("should include all purchase details", () => {
      const props: PurchaseCompletedProperties = {
        product_id: "prod_123",
        amount: 20000,
        currency: "usd",
        stripe_session_id: "cs_test_123",
        user_id: "user_123",
        company_slug: "google",
        role_slug: "software-engineer",
        experiment: "paywall_test",
        variant: "freemium",
      };

      expect(props.stripe_session_id).toBe("cs_test_123");
      expect(props.user_id).toBe("user_123");
      expect(props.amount).toBe(20000);
    });
  });

  describe("PaywallEventProperties", () => {
    it("should include paywall-specific properties", () => {
      const props: PaywallEventProperties = {
        journey_id: "journey_123",
        paywall_variant: "hard",
        price: 200,
        experiment: "paywall_test",
        variant: "direct_paywall",
      };

      expect(props.journey_id).toBe("journey_123");
      expect(props.paywall_variant).toBe("hard");
      expect(props.price).toBe(200);
    });

    it("should accept all paywall variants", () => {
      const hard: PaywallEventProperties = { paywall_variant: "hard" };
      const soft: PaywallEventProperties = { paywall_variant: "soft" };
      const teaser: PaywallEventProperties = { paywall_variant: "teaser" };

      expect(hard.paywall_variant).toBe("hard");
      expect(soft.paywall_variant).toBe("soft");
      expect(teaser.paywall_variant).toBe("teaser");
    });
  });

  describe("JourneyStepProperties", () => {
    it("should include journey step details", () => {
      const props: JourneyStepProperties = {
        journey_id: "journey_123",
        step_index: 2,
        step_id: "step_abc",
        total_steps: 10,
        company_slug: "google",
        role_slug: "software-engineer",
      };

      expect(props.step_index).toBe(2);
      expect(props.step_id).toBe("step_abc");
      expect(props.total_steps).toBe(10);
    });
  });

  describe("AuthEventProperties", () => {
    it("should include auth method and trigger", () => {
      const props: AuthEventProperties = {
        method: "google",
        trigger: "paywall",
        company_slug: "google",
        role_slug: "software-engineer",
      };

      expect(props.method).toBe("google");
      expect(props.trigger).toBe("paywall");
    });

    it("should accept all trigger types", () => {
      const paywall: AuthEventProperties = { trigger: "paywall" };
      const direct: AuthEventProperties = { trigger: "direct" };
      const protectedRoute: AuthEventProperties = { trigger: "protected_route" };

      expect(paywall.trigger).toBe("paywall");
      expect(direct.trigger).toBe("direct");
      expect(protectedRoute.trigger).toBe("protected_route");
    });
  });

  describe("UserProperties", () => {
    it("should include all user properties", () => {
      const props: UserProperties = {
        target_company: "google",
        target_role: "software-engineer",
        paywall_variant: "freemium",
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "interview_prep",
      };

      expect(props.target_company).toBe("google");
      expect(props.target_role).toBe("software-engineer");
      expect(props.paywall_variant).toBe("freemium");
      expect(props.utm_source).toBe("google");
    });
  });

  describe("AnalyticsConfig", () => {
    it("should have required and optional fields", () => {
      const config: AnalyticsConfig = {
        apiKey: "phc_test_key",
        apiHost: "https://app.posthog.com",
        debug: true,
        enabled: true,
      };

      expect(config.apiKey).toBe("phc_test_key");
      expect(config.apiHost).toBe("https://app.posthog.com");
      expect(config.debug).toBe(true);
      expect(config.enabled).toBe(true);
    });

    it("should work with minimal config", () => {
      const config: AnalyticsConfig = {
        apiKey: "phc_test_key",
        apiHost: "https://app.posthog.com",
      };

      expect(config.apiKey).toBeDefined();
      expect(config.debug).toBeUndefined();
    });
  });

  describe("ServerPurchaseEvent", () => {
    it("should have required fields for server tracking", () => {
      const event: ServerPurchaseEvent = {
        event: "purchase_completed",
        distinct_id: "user_123",
        properties: {
          product_id: "prod_123",
          amount: 20000,
          currency: "usd",
          company_slug: "google",
          role_slug: "software-engineer",
          variant: "freemium",
        },
        timestamp: "2024-01-15T10:30:00Z",
      };

      expect(event.event).toBe("purchase_completed");
      expect(event.distinct_id).toBe("user_123");
      expect(event.properties.amount).toBe(20000);
    });
  });
});
