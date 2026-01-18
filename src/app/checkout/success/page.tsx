import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheckoutSuccessContent } from './CheckoutSuccessContent';

export const metadata: Metadata = {
  title: 'Purchase Complete | JobWiz',
  description: 'Thank you for your purchase! Your interview prep content is now unlocked.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading your purchase details...</p>
      </div>
    </div>
  );
}
