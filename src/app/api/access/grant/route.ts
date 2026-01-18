/**
 * POST /api/access/grant - Grant access after successful Stripe checkout
 * Issue: #117 - Freemium model with paywall
 *
 * This endpoint verifies a Stripe session, creates user if needed, and grants access.
 * Used as a backup to webhooks (e.g., when webhook isn't configured for test mode).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeClient } from '@/lib/stripe/client';

export const dynamic = 'force-dynamic';

interface GrantRequest {
  session_id: string;
  redirect_to?: string;
}

interface GrantResponse {
  success: boolean;
  message: string;
  access_grant_id?: string;
  user_id?: string;
  email?: string;
  is_new_user?: boolean;
  magic_link?: string;
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
    const { session_id, redirect_to } = body;

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

    // Get metadata and customer email
    const companySlug = session.metadata?.company_slug;
    const roleSlug = session.metadata?.role_slug;
    let userId = session.metadata?.user_id;
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!companySlug || !roleSlug) {
      return NextResponse.json(
        { success: false, message: 'Missing company/role metadata' },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, message: 'No customer email found' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    let isNewUser = false;

    // If no user_id in metadata, find or create user by email
    if (!userId) {
      // Check if user exists with this email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user with random password (they'll use magic link to sign in)
        const tempPassword = crypto.randomUUID() + crypto.randomUUID();
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: customerEmail,
          password: tempPassword,
          email_confirm: true, // Auto-confirm since they paid
        });

        if (createError) {
          console.error('Failed to create user:', createError);
          return NextResponse.json(
            { success: false, message: 'Failed to create user account' },
            { status: 500 }
          );
        }

        userId = newUser.user.id;
        isNewUser = true;
      }
    }

    // Check if access grant already exists for this user
    const { data: existingGrant } = await supabase
      .from('access_grants')
      .select('id')
      .eq('company_slug', companySlug)
      .eq('role_slug', roleSlug)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingGrant) {
      return NextResponse.json({
        success: true,
        message: 'Access already granted',
        access_grant_id: existingGrant.id,
        user_id: userId,
        email: customerEmail,
        is_new_user: false,
      });
    }

    // Create access grant
    const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 100 years

    const { data: grant, error } = await supabase
      .from('access_grants')
      .insert({
        user_id: userId,
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

    // Generate magic link for auto-sign-in
    let magicLink: string | undefined;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const finalRedirect = redirect_to || `/${companySlug}/${roleSlug}/journey`;
    // Magic link should redirect through auth callback to exchange token for session
    const callbackUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(finalRedirect)}`;

    console.log('Magic link config:', { baseUrl, finalRedirect, callbackUrl });

    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: customerEmail,
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (linkError) {
        console.error('Magic link generation error:', linkError);
      } else if (linkData?.properties?.action_link) {
        magicLink = linkData.properties.action_link;
        // Log the magic link URL structure (mask the token)
        const linkUrl = new URL(magicLink);
        console.log('Magic link generated:', {
          host: linkUrl.host,
          pathname: linkUrl.pathname,
          redirectTo: linkUrl.searchParams.get('redirect_to'),
        });
      }
    } catch (linkErr) {
      console.error('Failed to generate magic link:', linkErr);
      // Continue without magic link - user can still sign in manually
    }

    return NextResponse.json({
      success: true,
      message: isNewUser ? 'Account created and access granted' : 'Access granted successfully',
      access_grant_id: grant.id,
      user_id: userId,
      email: customerEmail,
      is_new_user: isNewUser,
      magic_link: magicLink,
    });
  } catch (error) {
    console.error('Grant access error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
