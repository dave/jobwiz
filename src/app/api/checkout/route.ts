/**
 * POST /api/checkout - Create Stripe Checkout session
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createCheckoutSession, validateCheckoutRequest } from '@/lib/stripe';
import type { CheckoutErrorResponse, CreateCheckoutResponse } from '@/lib/stripe';

/**
 * Create a Supabase client for server-side use
 */
async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateCheckoutResponse | CheckoutErrorResponse>> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = validateCheckoutRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get user ID if authenticated
    let userId: string | undefined;
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      // User not authenticated - continue without user ID
    }

    // Get base URL from request origin for redirects
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/');

    // Create checkout session
    const result = await createCheckoutSession(validation.request, userId, origin || undefined);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Checkout error:', error);

    // Handle Stripe errors
    if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { error: 'Payment system not configured', code: 'stripe_not_configured' },
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to create checkout session', code: 'checkout_failed' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<CheckoutErrorResponse>> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to create a checkout session.' },
    { status: 405 }
  );
}
