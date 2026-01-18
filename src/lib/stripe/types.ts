/**
 * Types for Stripe checkout integration
 */

/**
 * Access type for purchased content
 */
export type AccessType = 'single' | 'company_bundle' | 'role_bundle' | 'full';

/**
 * Product metadata stored in Stripe
 */
export interface ProductMetadata {
  access_type: AccessType;
  company_slug: string | null;
  role_slug: string | null;
}

/**
 * Request body for creating checkout session
 */
export interface CreateCheckoutRequest {
  product_id: string;
  company_slug: string;
  role_slug: string;
  success_url?: string;
  cancel_url?: string;
}

/**
 * Response from checkout creation
 */
export interface CreateCheckoutResponse {
  url: string;
  session_id: string;
}

/**
 * Error response from checkout
 */
export interface CheckoutErrorResponse {
  error: string;
  code?: string;
}

/**
 * Checkout session data for success page
 */
export interface CheckoutSessionData {
  id: string;
  customer_email: string | null;
  payment_status: string;
  company_slug: string | null;
  role_slug: string | null;
  amount_total: number | null;
  currency: string | null;
}

/**
 * Product configuration for a company/role
 */
export interface ProductConfig {
  id: string;
  price_id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  access_type: AccessType;
  company_slug: string | null;
  role_slug: string | null;
}

/**
 * Default product for single company/role access
 */
export const DEFAULT_PRODUCT: Omit<ProductConfig, 'company_slug' | 'role_slug'> = {
  id: 'prod_single_access',
  price_id: 'price_single_access',
  name: 'Interview Prep Course',
  description: 'Full access to company and role-specific interview preparation content',
  amount: 20000, // $200.00 in cents
  currency: 'usd',
  access_type: 'single',
};

/**
 * Validate product metadata from Stripe
 */
export function isValidProductMetadata(metadata: Record<string, string>): metadata is Record<string, string> & { access_type: AccessType } {
  const validAccessTypes: AccessType[] = ['single', 'company_bundle', 'role_bundle', 'full'];
  return metadata.access_type != null && validAccessTypes.includes(metadata.access_type as AccessType);
}

/**
 * Parse product metadata from Stripe session
 */
export function parseProductMetadata(metadata: Record<string, string> | null): ProductMetadata {
  if (!metadata || !isValidProductMetadata(metadata)) {
    return {
      access_type: 'single',
      company_slug: null,
      role_slug: null,
    };
  }

  return {
    access_type: metadata.access_type as AccessType,
    company_slug: metadata.company_slug || null,
    role_slug: metadata.role_slug || null,
  };
}
