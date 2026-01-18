/**
 * GET /api/checkout/session - Retrieve Stripe Checkout session
 */
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering (uses searchParams)
export const dynamic = 'force-dynamic';
import { getCheckoutSession } from '@/lib/stripe';
import type { CheckoutErrorResponse, CheckoutSessionData } from '@/lib/stripe';

interface SessionResponse {
  session: CheckoutSessionData;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<SessionResponse | CheckoutErrorResponse>> {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    // Validate session ID format (Stripe session IDs start with cs_)
    if (!sessionId.startsWith('cs_')) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const session = await getCheckoutSession(sessionId);

    return NextResponse.json({ session }, { status: 200 });
  } catch (error) {
    console.error('Session retrieval error:', error);

    // Handle Stripe errors
    if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { error: 'Payment system not configured', code: 'stripe_not_configured' },
        { status: 503 }
      );
    }

    // Handle not found
    if (error instanceof Error && error.message.includes('No such checkout.session')) {
      return NextResponse.json(
        { error: 'Session not found', code: 'session_not_found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve session', code: 'retrieval_failed' },
      { status: 500 }
    );
  }
}
