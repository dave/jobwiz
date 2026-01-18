import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Checkout Cancelled | Ace That Interview',
  description: 'Your checkout was cancelled. No payment has been made.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-600"
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
          Checkout Cancelled
        </h1>
        <p className="text-gray-600 mb-6">
          Your checkout was cancelled. No payment has been made. You can return
          to the landing page to try again whenever you&apos;re ready.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Browse Interview Prep
          </Link>

          <p className="text-sm text-gray-500">
            Have questions?{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
