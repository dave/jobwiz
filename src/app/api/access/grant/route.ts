/**
 * POST /api/access/grant - Grant access after successful Stripe checkout
 * Issue: #117 - Freemium model with paywall
 *
 * This endpoint verifies a Stripe session and grants access.
 * Used as a backup to webhooks (e.g., when webhook isn't configured for test mode).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeClient } from '@/lib/stripe/client';

export const dynamic = 'force-dynamic';

interface GrantRequest {
  session_id: string;
}

interface GrantResponse {
  success: boolean;
  message: string;
  access_grant_id?: string;
}

/**
 * Create a Supabase client with service role for granting access
 */
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GrantResponse>> {
  try {
    const body: GrantRequest = await request.json();
    const { session_id } = body;

    if (!session_id || !session_id.startsWith('cs_')) {
      return NextResponse.json(
        { success: false, message: 'Invalid session_id' },
        { status: 400 }
      );
    }

    // Verify the session with Stripe
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Check payment is complete
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, message: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Get metadata
    const companySlug = session.metadata?.company_slug;
    const roleSlug = session.metadata?.role_slug;
    const userId = session.metadata?.user_id;

    if (!companySlug || !roleSlug) {
      return NextResponse.json(
        { success: false, message: 'Missing company/role metadata' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if access grant already exists
    const { data: existingGrant } = await supabase
      .from('access_grants')
      .select('id')
      .eq('company_slug', companySlug)
      .eq('role_slug', roleSlug)
      .eq(userId ? 'user_id' : 'id', userId || session_id)
      .maybeSingle();

    if (existingGrant) {
      return NextResponse.json({
        success: true,
        message: 'Access already granted',
        access_grant_id: existingGrant.id,
      });
    }

    // Create access grant
    const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 100 years

    const { data: grant, error } = await supabase
      .from('access_grants')
      .insert({
        user_id: userId || null,
        company_slug: companySlug,
        role_slug: roleSlug,
        source: 'purchase',
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create access grant:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to grant access' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Access granted successfully',
      access_grant_id: grant.id,
    });
  } catch (error) {
    console.error('Grant access error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
