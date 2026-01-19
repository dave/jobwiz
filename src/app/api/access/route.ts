/**
 * GET /api/access - Check if user has access to company/role content
 * Issue: #117 - Freemium model with paywall
 */
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering (uses request.url)
export const dynamic = 'force-dynamic';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkAccess } from '@/lib/access';

interface AccessResponse {
  hasAccess: boolean;
}

interface ErrorResponse {
  error: string;
}

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

export async function GET(
  request: NextRequest
): Promise<NextResponse<AccessResponse | ErrorResponse>> {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const role = searchParams.get('role');

    // Validate required parameters
    if (!company || !role) {
      return NextResponse.json(
        { error: 'Missing required parameters: company and role' },
        { status: 400 }
      );
    }

    // Get user from session
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[API /access] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
      company,
      role,
    });

    // No user = no access
    if (!user) {
      console.log('[API /access] No user, returning hasAccess: false');
      return NextResponse.json({ hasAccess: false }, { status: 200 });
    }

    // Check if user has access
    const result = await checkAccess(supabase, user.id, company, role);

    console.log('[API /access] Access check result:', {
      userId: user.id,
      company,
      role,
      hasAccess: result.hasAccess,
      grantId: result.grantId,
      source: result.source,
    });

    return NextResponse.json({ hasAccess: result.hasAccess }, { status: 200 });
  } catch (error) {
    console.error('Access check error:', error);
    return NextResponse.json(
      { error: 'Failed to check access' },
      { status: 500 }
    );
  }
}
