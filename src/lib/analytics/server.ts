/**
 * Server-side Analytics
 * Issue: #43 - Conversion tracking events
 *
 * Server-side event tracking for purchases and other backend events
 * Uses PostHog's capture API directly via HTTP
 */

import type { PurchaseCompletedProperties } from "./types";

/**
 * PostHog Capture API endpoint
 */
const POSTHOG_CAPTURE_URL = "https://app.posthog.com/capture";

/**
 * Get PostHog API key for server-side usage
 * Uses the same public key as client-side
 */
function getServerApiKey(): string | null {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY || null;
}

/**
 * Get PostHog host for server-side usage
 */
function getServerHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
}

/**
 * Check if server-side analytics is configured
 */
export function isServerAnalyticsConfigured(): boolean {
  return Boolean(getServerApiKey());
}

/**
 * Server-side event capture
 * Sends events directly to PostHog's capture API
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<boolean> {
  const apiKey = getServerApiKey();

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics:Server] Event (not sent):", event, properties);
    }
    return false;
  }

  const host = getServerHost();
  const captureUrl = `${host}/capture/`;

  try {
    const response = await fetch(captureUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: "posthog-node",
          $lib_version: "1.0.0",
        },
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error(
        "[Analytics:Server] Failed to send event:",
        response.status,
        response.statusText
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Analytics:Server] Error sending event:", error);
    return false;
  }
}

/**
 * Server-side purchase completed event
 * Called from Stripe webhook handler
 */
export async function trackServerPurchaseCompleted(
  distinctId: string,
  properties: PurchaseCompletedProperties
): Promise<boolean> {
  return captureServerEvent(distinctId, "purchase_completed", {
    ...properties,
    // Set the variant as a user property for attribution
    $set: properties.variant
      ? { paywall_variant: properties.variant }
      : undefined,
  });
}

/**
 * Server-side checkout started event
 * Called when checkout session is created
 */
export async function trackServerCheckoutStarted(
  distinctId: string,
  properties: {
    product_id?: string;
    company_slug?: string;
    role_slug?: string;
    amount?: number;
    currency?: string;
    experiment?: string;
    variant?: string;
  }
): Promise<boolean> {
  return captureServerEvent(distinctId, "checkout_started", properties);
}

/**
 * Server-side identify call
 * Associates a distinct ID with user properties
 */
export async function identifyServer(
  distinctId: string,
  properties: Record<string, unknown> = {}
): Promise<boolean> {
  const apiKey = getServerApiKey();

  if (!apiKey) {
    return false;
  }

  const host = getServerHost();
  const captureUrl = `${host}/capture/`;

  try {
    const response = await fetch(captureUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        event: "$identify",
        distinct_id: distinctId,
        properties: {},
        $set: properties,
        timestamp: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Analytics:Server] Error identifying user:", error);
    return false;
  }
}

/**
 * Server-side alias call
 * Links an anonymous ID to an authenticated user ID
 */
export async function aliasServer(
  distinctId: string,
  alias: string
): Promise<boolean> {
  const apiKey = getServerApiKey();

  if (!apiKey) {
    return false;
  }

  const host = getServerHost();
  const captureUrl = `${host}/capture/`;

  try {
    const response = await fetch(captureUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        event: "$create_alias",
        distinct_id: distinctId,
        properties: {
          alias,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Analytics:Server] Error creating alias:", error);
    return false;
  }
}
