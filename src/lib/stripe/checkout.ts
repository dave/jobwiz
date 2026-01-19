/**
 * Stripe Checkout session management
 */
import type Stripe from 'stripe';
import { getStripeClient } from './client';
import { DEFAULT_PRODUCT, type CheckoutSessionData, type CreateCheckoutRequest, type CreateCheckoutResponse } from './types';

/**
 * Get base URL for redirects
 */
function getBaseUrl(): string {
  // In development, always use localhost
  if (process.env.NODE_ENV === 'development') {
    return process.env.DEV_BASE_URL || 'http://localhost:3000';
  }
  // In production, use the NEXT_PUBLIC_BASE_URL or VERCEL_URL
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Create a Stripe Checkout session
 */
export async function createCheckoutSession(
  request: CreateCheckoutRequest,
  userId?: string,
  originUrl?: string
): Promise<CreateCheckoutResponse> {
  const stripe = getStripeClient();
  const baseUrl = originUrl || getBaseUrl();

  const successUrl = request.success_url || `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = request.cancel_url || `${baseUrl}/${request.company_slug}/${request.role_slug}`;

  // Build metadata for the session
  const metadata: Record<string, string> = {
    company_slug: request.company_slug,
    role_slug: request.role_slug,
    access_type: 'single',
  };

  if (userId) {
    metadata.user_id = userId;
  }

  // Create the checkout session
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    line_items: [
      {
        price_data: {
          currency: DEFAULT_PRODUCT.currency,
          unit_amount: DEFAULT_PRODUCT.amount,
          product_data: {
            name: `${formatCompanyName(request.company_slug)} ${formatRoleName(request.role_slug)} Interview Prep`,
            description: DEFAULT_PRODUCT.description,
          },
        },
        quantity: 1,
      },
    ],
  };

  // If product_id is provided and it's a real Stripe price, use that instead
  if (request.product_id && request.product_id.startsWith('price_')) {
    sessionParams.line_items = [
      {
        price: request.product_id,
        quantity: 1,
      },
    ];
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error('Checkout session created but no URL returned');
  }

  return {
    url: session.url,
    session_id: session.id,
  };
}

/**
 * Retrieve checkout session data
 */
export async function getCheckoutSession(sessionId: string): Promise<CheckoutSessionData> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'payment_intent'],
  });

  return {
    id: session.id,
    customer_email: session.customer_email || null,
    payment_status: session.payment_status,
    company_slug: session.metadata?.company_slug || null,
    role_slug: session.metadata?.role_slug || null,
    amount_total: session.amount_total,
    currency: session.currency,
  };
}

/**
 * Format company slug to display name
 */
function formatCompanyName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format role slug to display name
 */
function formatRoleName(slug: string): string {
  const roleNames: Record<string, string> = {
    'software-engineer': 'Software Engineer',
    'product-manager': 'Product Manager',
    'data-scientist': 'Data Scientist',
    'swe': 'Software Engineer',
    'pm': 'Product Manager',
    'ds': 'Data Scientist',
  };

  return roleNames[slug] || slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate checkout request
 */
export function validateCheckoutRequest(body: unknown): { valid: true; request: CreateCheckoutRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const data = body as Record<string, unknown>;

  // product_id is optional - defaults to STRIPE_SINGLE_PRODUCT_ID env var
  const productId = typeof data.product_id === 'string'
    ? data.product_id
    : process.env.STRIPE_SINGLE_PRODUCT_ID;

  if (!productId) {
    return { valid: false, error: 'product_id is required (set STRIPE_SINGLE_PRODUCT_ID env var or pass in request)' };
  }

  if (!data.company_slug || typeof data.company_slug !== 'string') {
    return { valid: false, error: 'company_slug is required and must be a string' };
  }

  if (!data.role_slug || typeof data.role_slug !== 'string') {
    return { valid: false, error: 'role_slug is required and must be a string' };
  }

  // Validate slug formats (lowercase, alphanumeric with hyphens)
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(data.company_slug)) {
    return { valid: false, error: 'company_slug must be lowercase with hyphens only' };
  }

  if (!slugPattern.test(data.role_slug)) {
    return { valid: false, error: 'role_slug must be lowercase with hyphens only' };
  }

  return {
    valid: true,
    request: {
      product_id: productId,
      company_slug: data.company_slug,
      role_slug: data.role_slug,
      success_url: typeof data.success_url === 'string' ? data.success_url : undefined,
      cancel_url: typeof data.cancel_url === 'string' ? data.cancel_url : undefined,
    },
  };
}
