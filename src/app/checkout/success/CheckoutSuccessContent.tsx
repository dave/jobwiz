'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
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
  needs_signin?: boolean;
  email?: string;
  magic_link?: string;
}

export function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const sessionId = searchParams.get('session_id');

  const [session, setSession] = useState<CheckoutSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [needsSignin, setNeedsSignin] = useState(false);

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

          try {
            // Call grant API - pass whether user is logged in
            const grantResponse = await fetch('/api/access/grant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: sessionId,
                redirect_to: journeyUrl,
                is_logged_in: !!user,
              }),
            });
            const grantData: GrantResponse = await grantResponse.json();
            console.log('Grant response:', grantData);

            if (grantData.success) {
              setAccessGranted(true);
              setUserEmail(grantData.email || null);
              setIsNewUser(grantData.is_new_user || false);
              setNeedsSignin(grantData.needs_signin || false);

              // FLOW 1: User is already logged in - redirect directly
              if (user) {
                console.log('User logged in, redirecting directly to:', journeyUrl);
                router.push(journeyUrl);
                return;
              }

              // FLOW 2 & 3: User not logged in - try magic link
              if (grantData.magic_link) {
                console.log('Redirecting to magic link...');
                window.location.href = grantData.magic_link;
                return;
              }

              // Fallback: No magic link available - show sign-in prompt
              console.log('No magic link, user needs to sign in manually');
              setNeedsSignin(true);
            } else {
              console.error('Grant failed:', grantData.message);
            }
          } catch (grantErr) {
            console.error('Failed to grant access:', grantErr);
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  Redirecting you to your content...
                </p>
              </div>
            ) : needsSignin || !accessGranted ? (
              // Needs to sign in (magic link failed or not available)
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 mb-2">
                  {isNewUser ? (
                    <><span className="font-semibold">Account created!</span> Sign in to access your content:</>
                  ) : (
                    <>Sign in to access your purchased content:</>
                  )}
                </p>
                {userEmail && (
                  <p className="text-sm font-medium text-blue-900 mb-3">{userEmail}</p>
                )}
              </div>
            ) : (
              // Magic link redirect in progress
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Setting up your account...
                </p>
              </div>
            )}

            {user ? (
              // Logged in - show direct link as backup
              <Link
                href={journeyUrl}
                className="inline-block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Your Interview Prep
              </Link>
            ) : (
              // Not logged in - show sign in button
              <Link
                href={`/login?email=${encodeURIComponent(userEmail || session.customer_email || '')}&redirectTo=${encodeURIComponent(journeyUrl)}`}
                className="inline-block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In to Access Content
              </Link>
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
