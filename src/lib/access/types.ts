/**
 * Types for access management
 * Issue: #40 - Purchase unlock flow
 */

import type { AccessType } from '@/lib/stripe/types';

/**
 * Access grant stored in database
 */
export interface AccessGrant {
  id: string;
  user_id: string;
  company_slug: string | null;
  role_slug: string | null;
  granted_at: string;
  expires_at: string;
  purchase_id: string | null;
  source: AccessSource;
  created_at: string;
}

/**
 * Source of access grant
 */
export type AccessSource = 'purchase' | 'admin' | 'promo' | 'refund_revoke';

/**
 * Result of access check
 */
export interface AccessCheckResult {
  hasAccess: boolean;
  userId?: string;
  grantId?: string;
  expiresAt?: string;
  source?: AccessSource;
}

/**
 * Input for granting access
 */
export interface GrantAccessInput {
  userId: string;
  companySlug: string | null;
  roleSlug: string | null;
  purchaseId?: string;
  source?: AccessSource;
  expiresAt?: string;
}

/**
 * Input for granting access from a bundle
 */
export interface GrantBundleAccessInput {
  userId: string;
  accessType: AccessType;
  companySlug?: string;
  roleSlug?: string;
  purchaseId?: string;
  source?: AccessSource;
}

/**
 * Guest purchase stored for linking
 */
export interface GuestPurchase {
  id: string;
  email: string;
  stripe_session_id: string;
  company_slug: string;
  role_slug: string;
  amount: number;
  currency: string;
  created_at: string;
  linked_user_id: string | null;
  linked_at: string | null;
}

/**
 * Input for creating guest purchase
 */
export interface CreateGuestPurchaseInput {
  email: string;
  stripeSessionId: string;
  companySlug: string;
  roleSlug: string;
  amount: number;
  currency: string;
}
