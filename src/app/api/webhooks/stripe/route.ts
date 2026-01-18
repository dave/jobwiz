/**
 * Stripe Webhook Handler
 * Issue: #38 - Stripe webhook handlers
 *
 * Receives and processes Stripe webhook events:
 * - checkout.session.completed: Creates purchase and access grant
 * - charge.refunded: Revokes access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, processWebhookEvent } from '@/lib/stripe/webhooks';
import type { WebhookErrorResponse } from '@/lib/stripe/types';

/**
 * Create a Supabase client with service role for webhook processing
 */
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration missing for webhook processing');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * POST /api/webhooks/stripe
 * Receives Stripe webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Get the raw body for signature verification
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    const errorResponse: WebhookErrorResponse = {
      error: 'Failed to read request body',
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // Get the Stripe signature header
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    const errorResponse: WebhookErrorResponse = {
      error: 'Missing stripe-signature header',
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // Verify the webhook signature and construct the event
  let event;
  try {
    event = await verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('Webhook signature verification failed:', message);
    const errorResponse: WebhookErrorResponse = {
      error: message,
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // Create Supabase service client for database operations
  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create database client';
    console.error('Failed to create Supabase client:', message);
    const errorResponse: WebhookErrorResponse = {
      error: 'Internal server error',
      event_id: event.id,
      event_type: event.type,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }

  // Process the webhook event
  try {
    const result = await processWebhookEvent(supabase, event);

    if (!result.success) {
      console.error('Webhook processing failed:', result);
      // Still return 200 to acknowledge receipt (Stripe will not retry)
      // but log the error for investigation
      return NextResponse.json({
        received: true,
        processed: false,
        event_id: event.id,
        event_type: event.type,
        message: result.message,
      });
    }

    // Success response
    return NextResponse.json({
      received: true,
      processed: true,
      event_id: event.id,
      event_type: event.type,
      purchase_id: result.purchase_id,
      access_grant_id: result.access_grant_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown processing error';
    console.error('Webhook processing error:', {
      event_id: event.id,
      event_type: event.type,
      error: message,
    });

    // Return 500 to trigger Stripe retry for transient errors
    const errorResponse: WebhookErrorResponse = {
      error: 'Failed to process webhook event',
      event_id: event.id,
      event_type: event.type,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Disable body parsing for this route
 * Stripe requires the raw body for signature verification
 */
export const dynamic = 'force-dynamic';
