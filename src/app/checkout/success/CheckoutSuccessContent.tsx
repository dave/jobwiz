'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { createBrowserClient } from '@/lib/supabase/client';
import type { CheckoutSessionData } from '@/lib/stripe';

interface SessionResponse {
  session: CheckoutSessionData;
}

interface ErrorResponse {
  error: string;
}

interface GrantResponse {
  success: boolean;
  message: string;
  is_new_user?: boolean;
  email?: string;
}

export function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const sessionId = searchParams.get('session_id');

  const [session, setSession] = useState<CheckoutSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to initialize before proceeding
    if (authLoading) return;

    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    async function fetchSessionAndGrantAccess() {
      try {
        // Fetch session details
        const response = await fetch(`/api/checkout/session?session_id=${sessionId}`);
        const data: SessionResponse | ErrorResponse = await response.json();

        if (!response.ok) {
          const errorData = data as ErrorResponse;
          throw new Error(errorData.error || 'Failed to fetch session');
        }

        const sessionData = data as SessionResponse;
        setSession(sessionData.session);

        // If payment is complete, grant access
        if (sessionData.session.payment_status === 'paid') {
          const journeyUrl = sessionData.session.company_slug && sessionData.session.role_slug
            ? `/${sessionData.session.company_slug}/${sessionData.session.role_slug}/journey`
            : '/dashboard';

          // Grant access via API
          const grantResponse = await fetch('/api/access/grant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const grantData: GrantResponse = await grantResponse.json();
          console.log('Grant response:', grantData);

          if (!grantData.success) {
            console.error('Grant failed:', grantData.message);
            setLoading(false);
            return;
          }

          setUserEmail(grantData.email || null);

          // If user is logged in, redirect directly to content
          if (user) {
            console.log('User logged in, redirecting to:', journeyUrl);
            router.push(journeyUrl);
            return;
          }

          // User not logged in - send magic link email
          const supabase = createBrowserClient();
          const baseUrl = window.location.origin;
          const callbackUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(journeyUrl)}`;

          console.log('Sending magic link email to:', grantData.email);
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: grantData.email!,
            options: {
              emailRedirectTo: callbackUrl,
            },
          });

          if (otpError) {
            console.error('Failed to send magic link:', otpError);
          } else {
            setMagicLinkSent(true);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchSessionAndGrantAccess();
  }, [sessionId, user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your purchase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isPaid = session.payment_status === 'paid';
  const journeyUrl = session.company_slug && session.role_slug
    ? `/${session.company_slug}/${session.role_slug}/journey`
    : '/dashboard';

  const formattedAmount = session.amount_total
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: session.currency || 'usd',
      }).format(session.amount_total / 100)
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {isPaid ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Purchase Complete!
            </h1>
            <p className="text-gray-600 mb-6">
              Thank you for your purchase. Your interview prep content is now
              unlocked.
            </p>

            {formattedAmount && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Amount paid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formattedAmount}
                </p>
              </div>
            )}

            {/* Show appropriate message based on user state */}
            {user ? (
              // Logged in user - will be auto-redirected
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800">
                    Redirecting you to your content...
                  </p>
                </div>
                <Link
                  href={journeyUrl}
                  className="inline-block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Start Your Interview Prep
                </Link>
              </>
            ) : magicLinkSent ? (
              // Magic link sent - tell user to check email
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-blue-900 font-semibold mb-2">Check your email</p>
                <p className="text-sm text-blue-800 mb-2">
                  We sent a sign-in link to:
                </p>
                <p className="text-sm font-medium text-blue-900">{userEmail}</p>
                <p className="text-xs text-blue-700 mt-3">
                  Click the link in the email to access your content
                </p>
              </div>
            ) : (
              // Fallback - something went wrong, show manual sign in
              <>
                <p className="text-sm text-gray-500 mb-6">
                  Sign in to access your content
                </p>
                <Link
                  href={`/login?email=${encodeURIComponent(userEmail || session.customer_email || '')}&redirectTo=${encodeURIComponent(journeyUrl)}`}
                  className="inline-block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}

            <p className="text-sm text-gray-400 mt-4">
              Order ID: {session.id.slice(-8)}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Pending
            </h1>
            <p className="text-gray-600 mb-6">
              Your payment is being processed. Please wait a moment and refresh
              the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </>
        )}
      </div>
    </div>
  );
}
