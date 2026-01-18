/**
 * Analytics Types
 * Issue: #43 - Conversion tracking events
 *
 * Type definitions for PostHog analytics integration
 */

/**
 * Event names tracked in the application
 */
export type EventName =
  | "page_view"
  | "cta_click"
  | "checkout_started"
  | "purchase_completed"
  | "paywall_impression"
  | "paywall_cta_click"
  | "paywall_unlock"
  | "journey_step_complete"
  | "auth_started"
  | "auth_complete";

/**
 * Base event properties included in all events
 */
export interface BaseEventProperties {
  /** Current experiment name (if in experiment) */
  experiment?: string;
  /** Assigned variant for the experiment */
  variant?: string;
  /** Company slug (if applicable) */
  company_slug?: string;
  /** Role slug (if applicable) */
  role_slug?: string;
  /** Page URL */
  url?: string;
  /** Timestamp of the event */
  timestamp?: string;
}

/**
 * Page view event properties
 */
export interface PageViewProperties extends BaseEventProperties {
  /** Page title */
  title?: string;
  /** Page path */
  path?: string;
  /** Referrer URL */
  referrer?: string;
}

/**
 * CTA click event properties
 */
export interface CTAClickProperties extends BaseEventProperties {
  /** Button identifier */
  button_id?: string;
  /** Button text */
  button_text?: string;
  /** CTA location on page */
  location?: string;
}

/**
 * Checkout started event properties
 */
export interface CheckoutStartedProperties extends BaseEventProperties {
  /** Product ID */
  product_id?: string;
  /** Price in cents */
  amount?: number;
  /** Currency code */
  currency?: string;
}

/**
 * Purchase completed event properties
 */
export interface PurchaseCompletedProperties extends BaseEventProperties {
  /** Product ID */
  product_id?: string;
  /** Price in cents */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** Stripe session ID */
  stripe_session_id?: string;
  /** User ID (if authenticated) */
  user_id?: string;
}

/**
 * Paywall event properties
 */
export interface PaywallEventProperties extends BaseEventProperties {
  /** Journey/content ID */
  journey_id?: string;
  /** Paywall variant (hard, soft, teaser) */
  paywall_variant?: "hard" | "soft" | "teaser";
  /** Price shown */
  price?: number;
}

/**
 * Journey step event properties
 */
export interface JourneyStepProperties extends BaseEventProperties {
  /** Journey ID */
  journey_id?: string;
  /** Step index */
  step_index?: number;
  /** Step ID */
  step_id?: string;
  /** Total steps */
  total_steps?: number;
}

/**
 * Auth event properties
 */
export interface AuthEventProperties extends BaseEventProperties {
  /** Auth method (email, google, magic_link) */
  method?: string;
  /** Trigger (what led to auth) */
  trigger?: "paywall" | "direct" | "protected_route";
}

/**
 * Union of all event properties
 */
export type EventProperties =
  | PageViewProperties
  | CTAClickProperties
  | CheckoutStartedProperties
  | PurchaseCompletedProperties
  | PaywallEventProperties
  | JourneyStepProperties
  | AuthEventProperties
  | BaseEventProperties;

/**
 * User properties set on the PostHog user profile
 */
export interface UserProperties {
  /** User's target company */
  target_company?: string;
  /** User's target role */
  target_role?: string;
  /** Paywall variant assigned to user */
  paywall_variant?: string;
  /** UTM source from first visit */
  utm_source?: string;
  /** UTM medium from first visit */
  utm_medium?: string;
  /** UTM campaign from first visit */
  utm_campaign?: string;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** PostHog API key */
  apiKey: string;
  /** PostHog host URL */
  apiHost: string;
  /** Whether to enable debug mode */
  debug?: boolean;
  /** Whether analytics is enabled */
  enabled?: boolean;
}

/**
 * Track event function signature
 */
export type TrackEventFn = (
  eventName: EventName,
  properties?: EventProperties
) => void;

/**
 * Identify user function signature
 */
export type IdentifyFn = (
  userId: string,
  properties?: UserProperties
) => void;

/**
 * Server-side event for purchase tracking
 */
export interface ServerPurchaseEvent {
  /** Event name */
  event: "purchase_completed";
  /** PostHog distinct ID */
  distinct_id: string;
  /** Event properties */
  properties: PurchaseCompletedProperties;
  /** Timestamp */
  timestamp: string;
}
