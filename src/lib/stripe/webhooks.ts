/**
 * Stripe webhook handling utilities
 * Issue: #38 - Stripe webhook handlers
 */

import type Stripe from 'stripe';
import { getStripeClient } from './client';
import type {
  WebhookEventResult,
  CreatePurchaseInput,
  CreateAccessGrantInput,
  PurchaseRecord,
  AccessGrantRecord,
} from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the webhook signing secret from environment
 */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Verify and construct a Stripe webhook event
 * Uses raw body for signature verification
 */
export async function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecret = getWebhookSecret();

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
    return event;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown verification error';
    throw new Error(`Webhook signature verification failed: ${message}`);
  }
}

/**
 * Check if a purchase already exists for idempotency
 */
export async function purchaseExists(
  supabase: SupabaseClient,
  stripeSessionId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (error) {
    console.error('Error checking purchase existence:', error);
    return false;
  }

  return data !== null;
}

/**
 * Create a purchase record in the database
 */
export async function createPurchase(
  supabase: SupabaseClient,
  input: CreatePurchaseInput
): Promise<PurchaseRecord> {
  const { data, error } = await supabase
    .from('purchases')
    .insert({
      user_id: input.user_id,
      stripe_session_id: input.stripe_session_id,
      stripe_payment_intent_id: input.stripe_payment_intent_id || null,
      amount: input.amount,
      currency: input.currency,
      company_slug: input.company_slug,
      role_slug: input.role_slug,
      status: 'completed',
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create purchase: ${error.message}`);
  }

  return data as PurchaseRecord;
}

/**
 * Create an access grant for a user
 */
export async function createAccessGrant(
  supabase: SupabaseClient,
  input: CreateAccessGrantInput
): Promise<AccessGrantRecord> {
  const { data, error } = await supabase
    .from('access_grants')
    .insert({
      user_id: input.user_id,
      company_slug: input.company_slug,
      role_slug: input.role_slug,
      purchase_id: input.purchase_id || null,
      source: input.source || 'purchase',
      expires_at: input.expires_at || new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years
    })
    .select()
    .single();

  if (error) {
    // Check if it's a unique constraint violation (already exists)
    if (error.code === '23505') {
      throw new Error('Access grant already exists for this user and company/role');
    }
    throw new Error(`Failed to create access grant: ${error.message}`);
  }

  return data as AccessGrantRecord;
}

/**
 * Revoke access grant (for refunds)
 */
export async function revokeAccessGrant(
  supabase: SupabaseClient,
  userId: string,
  companySlug: string,
  roleSlug: string
): Promise<void> {
  const { error } = await supabase
    .from('access_grants')
    .delete()
    .eq('user_id', userId)
    .eq('company_slug', companySlug)
    .eq('role_slug', roleSlug);

  if (error) {
    throw new Error(`Failed to revoke access grant: ${error.message}`);
  }
}

/**
 * Update purchase status (for refunds)
 */
export async function updatePurchaseStatus(
  supabase: SupabaseClient,
  stripeSessionId: string,
  status: 'pending' | 'completed' | 'refunded' | 'failed'
): Promise<void> {
  const { error } = await supabase
    .from('purchases')
    .update({ status })
    .eq('stripe_session_id', stripeSessionId);

  if (error) {
    throw new Error(`Failed to update purchase status: ${error.message}`);
  }
}

/**
 * Get purchase by Stripe session ID
 */
export async function getPurchaseBySessionId(
  supabase: SupabaseClient,
  stripeSessionId: string
): Promise<PurchaseRecord | null> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching purchase:', error);
    return null;
  }

  return data as PurchaseRecord | null;
}

/**
 * Extract metadata from a Stripe checkout session
 */
export function extractSessionMetadata(session: Stripe.Checkout.Session): {
  userId: string | null;
  companySlug: string | null;
  roleSlug: string | null;
} {
  const metadata = session.metadata || {};
  return {
    userId: metadata.user_id || null,
    companySlug: metadata.company_slug || null,
    roleSlug: metadata.role_slug || null,
  };
}

/**
 * Process checkout.session.completed event
 */
export async function processCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<WebhookEventResult> {
  const { userId, companySlug, roleSlug } = extractSessionMetadata(session);

  // Validate required metadata
  if (!userId) {
    return {
      success: false,
      event_type: 'checkout.session.completed',
      event_id: session.id,
      message: 'Missing user_id in session metadata',
    };
  }

  if (!companySlug || !roleSlug) {
    return {
      success: false,
      event_type: 'checkout.session.completed',
      event_id: session.id,
      message: 'Missing company_slug or role_slug in session metadata',
    };
  }

  // Check for idempotency
  const exists = await purchaseExists(supabase, session.id);
  if (exists) {
    return {
      success: true,
      event_type: 'checkout.session.completed',
      event_id: session.id,
      message: 'Purchase already exists (idempotent)',
    };
  }

  // Get payment intent ID if available
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // Create purchase record
  const purchase = await createPurchase(supabase, {
    user_id: userId,
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId || undefined,
    amount: session.amount_total || 0,
    currency: session.currency || 'usd',
    company_slug: companySlug,
    role_slug: roleSlug,
    metadata: {
      customer_email: session.customer_email,
      payment_status: session.payment_status,
    },
  });

  // Create access grant
  const accessGrant = await createAccessGrant(supabase, {
    user_id: userId,
    company_slug: companySlug,
    role_slug: roleSlug,
    purchase_id: purchase.id,
    source: 'purchase',
  });

  return {
    success: true,
    event_type: 'checkout.session.completed',
    event_id: session.id,
    message: 'Purchase and access grant created successfully',
    purchase_id: purchase.id,
    access_grant_id: accessGrant.id,
  };
}

/**
 * Process charge.refunded event
 */
export async function processChargeRefunded(
  supabase: SupabaseClient,
  charge: Stripe.Charge
): Promise<WebhookEventResult> {
  // Get the payment intent to find associated session
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!paymentIntentId) {
    return {
      success: false,
      event_type: 'charge.refunded',
      event_id: charge.id,
      message: 'No payment_intent associated with charge',
    };
  }

  // Find the purchase by payment intent ID
  const { data: purchase, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (error || !purchase) {
    return {
      success: false,
      event_type: 'charge.refunded',
      event_id: charge.id,
      message: 'Could not find purchase for refunded charge',
    };
  }

  // Update purchase status
  await updatePurchaseStatus(supabase, purchase.stripe_session_id, 'refunded');

  // Revoke access grant
  await revokeAccessGrant(
    supabase,
    purchase.user_id,
    purchase.company_slug,
    purchase.role_slug
  );

  return {
    success: true,
    event_type: 'charge.refunded',
    event_id: charge.id,
    message: 'Purchase marked as refunded and access revoked',
    purchase_id: purchase.id,
  };
}

/**
 * Process a Stripe webhook event
 */
export async function processWebhookEvent(
  supabase: SupabaseClient,
  event: Stripe.Event
): Promise<WebhookEventResult> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      return processCheckoutCompleted(supabase, session);
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      return processChargeRefunded(supabase, charge);
    }

    default:
      // Log unhandled event types but don't fail
      console.log(`Unhandled webhook event type: ${event.type}`);
      return {
        success: true,
        event_type: event.type,
        event_id: event.id,
        message: `Event type ${event.type} not handled`,
      };
  }
}
