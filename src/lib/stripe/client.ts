/**
 * Stripe client configuration
 */
import Stripe from 'stripe';

/**
 * Get Stripe secret key from environment
 */
function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return key;
}

/**
 * Create a Stripe client instance
 * Uses test keys in development if available
 */
export function createStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();

  return new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  });
}

/**
 * Get the public key for client-side usage
 */
export function getStripePublicKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set');
  }
  return key;
}

/**
 * Singleton instance of Stripe client
 */
let stripeInstance: Stripe | null = null;

/**
 * Get or create a Stripe client instance
 * Reuses existing instance if available
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    stripeInstance = createStripeClient();
  }
  return stripeInstance;
}

/**
 * Check if Stripe is configured (for testing/mocking)
 */
export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
