/**
 * Access grant storage and management functions
 * Issue: #40 - Purchase unlock flow
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccessGrant,
  AccessCheckResult,
  GrantAccessInput,
  GrantBundleAccessInput,
  GuestPurchase,
  CreateGuestPurchaseInput,
} from './types';
import type { AccessType } from '@/lib/stripe/types';

// ============================================================================
// Core Access Functions
// ============================================================================

/**
 * Grant access to a user for a specific company/role combination
 * Returns the created access grant
 */
export async function grantAccess(
  supabase: SupabaseClient,
  userId: string,
  companySlug: string | null,
  roleSlug: string | null,
  options: {
    purchaseId?: string;
    source?: 'purchase' | 'admin' | 'promo';
    expiresAt?: string;
  } = {}
): Promise<AccessGrant> {
  const {
    purchaseId = null,
    source = 'purchase',
    expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years
  } = options;

  const { data, error } = await supabase
    .from('access_grants')
    .insert({
      user_id: userId,
      company_slug: companySlug,
      role_slug: roleSlug,
      purchase_id: purchaseId,
      source,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    // Check if it's a unique constraint violation (already exists)
    if (error.code === '23505') {
      // Return existing grant instead
      const existing = await getAccessGrant(supabase, userId, companySlug, roleSlug);
      if (existing) {
        return existing;
      }
    }
    throw new Error(`Failed to grant access: ${error.message}`);
  }

  return data as AccessGrant;
}

/**
 * Check if a user has access to a specific company/role combination
 * Returns true if user has valid (non-expired) access grant
 */
export async function hasAccess(
  supabase: SupabaseClient,
  userId: string,
  companySlug: string,
  roleSlug: string
): Promise<boolean> {
  const result = await checkAccess(supabase, userId, companySlug, roleSlug);
  return result.hasAccess;
}

/**
 * Check user access with detailed result
 * Checks for exact match first, then falls back to broader grants (company-only, full access)
 */
export async function checkAccess(
  supabase: SupabaseClient,
  userId: string,
  companySlug: string,
  roleSlug: string
): Promise<AccessCheckResult> {
  const now = new Date().toISOString();

  // Query for grants that match this user
  // Priority: exact match > company bundle > role bundle > full access
  const { data: grants, error } = await supabase
    .from('access_grants')
    .select('*')
    .eq('user_id', userId)
    .gte('expires_at', now);

  if (error) {
    console.error('Error checking access:', error);
    return { hasAccess: false };
  }

  if (!grants || grants.length === 0) {
    return { hasAccess: false };
  }

  // Check for matching grants in priority order
  // 1. Exact match (company + role)
  const exactMatch = grants.find(
    (g: AccessGrant) => g.company_slug === companySlug && g.role_slug === roleSlug
  );
  if (exactMatch) {
    return {
      hasAccess: true,
      userId,
      grantId: exactMatch.id,
      expiresAt: exactMatch.expires_at,
      source: exactMatch.source,
    };
  }

  // 2. Company bundle (company match, any role)
  const companyMatch = grants.find(
    (g: AccessGrant) => g.company_slug === companySlug && g.role_slug === null
  );
  if (companyMatch) {
    return {
      hasAccess: true,
      userId,
      grantId: companyMatch.id,
      expiresAt: companyMatch.expires_at,
      source: companyMatch.source,
    };
  }

  // 3. Role bundle (any company, role match)
  const roleMatch = grants.find(
    (g: AccessGrant) => g.company_slug === null && g.role_slug === roleSlug
  );
  if (roleMatch) {
    return {
      hasAccess: true,
      userId,
      grantId: roleMatch.id,
      expiresAt: roleMatch.expires_at,
      source: roleMatch.source,
    };
  }

  // 4. Full access (both null)
  const fullAccess = grants.find(
    (g: AccessGrant) => g.company_slug === null && g.role_slug === null
  );
  if (fullAccess) {
    return {
      hasAccess: true,
      userId,
      grantId: fullAccess.id,
      expiresAt: fullAccess.expires_at,
      source: fullAccess.source,
    };
  }

  return { hasAccess: false };
}

/**
 * Revoke access for a user for a specific company/role combination
 * Sets expires_at to now (doesn't delete the record for audit purposes)
 */
export async function revokeAccess(
  supabase: SupabaseClient,
  userId: string,
  companySlug: string | null,
  roleSlug: string | null
): Promise<void> {
  // Build the query to match the exact grant
  let query = supabase
    .from('access_grants')
    .update({
      expires_at: new Date().toISOString(),
      source: 'refund_revoke',
    })
    .eq('user_id', userId);

  // Handle null values explicitly
  if (companySlug === null) {
    query = query.is('company_slug', null);
  } else {
    query = query.eq('company_slug', companySlug);
  }

  if (roleSlug === null) {
    query = query.is('role_slug', null);
  } else {
    query = query.eq('role_slug', roleSlug);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to revoke access: ${error.message}`);
  }
}

/**
 * Get a specific access grant
 */
export async function getAccessGrant(
  supabase: SupabaseClient,
  userId: string,
  companySlug: string | null,
  roleSlug: string | null
): Promise<AccessGrant | null> {
  let query = supabase
    .from('access_grants')
    .select('*')
    .eq('user_id', userId);

  if (companySlug === null) {
    query = query.is('company_slug', null);
  } else {
    query = query.eq('company_slug', companySlug);
  }

  if (roleSlug === null) {
    query = query.is('role_slug', null);
  } else {
    query = query.eq('role_slug', roleSlug);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error fetching access grant:', error);
    return null;
  }

  return data as AccessGrant | null;
}

/**
 * Get all access grants for a user
 */
export async function getUserAccessGrants(
  supabase: SupabaseClient,
  userId: string,
  includeExpired: boolean = false
): Promise<AccessGrant[]> {
  let query = supabase
    .from('access_grants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!includeExpired) {
    query = query.gte('expires_at', new Date().toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user access grants:', error);
    return [];
  }

  return (data ?? []) as AccessGrant[];
}

// ============================================================================
// Bundle Access Functions
// ============================================================================

/**
 * Grant access based on access type (handles bundles)
 * For bundles, creates multiple access grants
 */
export async function grantBundleAccess(
  supabase: SupabaseClient,
  input: GrantBundleAccessInput
): Promise<AccessGrant[]> {
  const {
    userId,
    accessType,
    companySlug,
    roleSlug,
    purchaseId,
    source = 'purchase',
  } = input;

  const grants: AccessGrant[] = [];

  switch (accessType) {
    case 'single':
      // Single access requires both company and role
      if (!companySlug || !roleSlug) {
        throw new Error('Single access requires both company_slug and role_slug');
      }
      const singleGrant = await grantAccess(supabase, userId, companySlug, roleSlug, {
        purchaseId,
        source,
      });
      grants.push(singleGrant);
      break;

    case 'company_bundle':
      // Company bundle: access to all roles for a company
      if (!companySlug) {
        throw new Error('Company bundle requires company_slug');
      }
      const companyGrant = await grantAccess(supabase, userId, companySlug, null, {
        purchaseId,
        source,
      });
      grants.push(companyGrant);
      break;

    case 'role_bundle':
      // Role bundle: access to a role across all companies
      if (!roleSlug) {
        throw new Error('Role bundle requires role_slug');
      }
      const roleGrant = await grantAccess(supabase, userId, null, roleSlug, {
        purchaseId,
        source,
      });
      grants.push(roleGrant);
      break;

    case 'full':
      // Full access: access to everything
      const fullGrant = await grantAccess(supabase, userId, null, null, {
        purchaseId,
        source,
      });
      grants.push(fullGrant);
      break;

    default:
      throw new Error(`Unknown access type: ${accessType}`);
  }

  return grants;
}

/**
 * Revoke bundle access
 */
export async function revokeBundleAccess(
  supabase: SupabaseClient,
  userId: string,
  accessType: AccessType,
  companySlug?: string,
  roleSlug?: string
): Promise<void> {
  switch (accessType) {
    case 'single':
      if (!companySlug || !roleSlug) {
        throw new Error('Single access requires both company_slug and role_slug');
      }
      await revokeAccess(supabase, userId, companySlug, roleSlug);
      break;

    case 'company_bundle':
      if (!companySlug) {
        throw new Error('Company bundle requires company_slug');
      }
      await revokeAccess(supabase, userId, companySlug, null);
      break;

    case 'role_bundle':
      if (!roleSlug) {
        throw new Error('Role bundle requires role_slug');
      }
      await revokeAccess(supabase, userId, null, roleSlug);
      break;

    case 'full':
      await revokeAccess(supabase, userId, null, null);
      break;

    default:
      throw new Error(`Unknown access type: ${accessType}`);
  }
}

// ============================================================================
// Guest Purchase Functions
// ============================================================================

/**
 * Create a guest purchase record (for users who checkout without an account)
 */
export async function createGuestPurchase(
  supabase: SupabaseClient,
  input: CreateGuestPurchaseInput
): Promise<GuestPurchase> {
  const { data, error } = await supabase
    .from('guest_purchases')
    .insert({
      email: input.email.toLowerCase(),
      stripe_session_id: input.stripeSessionId,
      company_slug: input.companySlug,
      role_slug: input.roleSlug,
      amount: input.amount,
      currency: input.currency,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create guest purchase: ${error.message}`);
  }

  return data as GuestPurchase;
}

/**
 * Get pending guest purchases by email
 */
export async function getGuestPurchasesByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<GuestPurchase[]> {
  const { data, error } = await supabase
    .from('guest_purchases')
    .select('*')
    .eq('email', email.toLowerCase())
    .is('linked_user_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching guest purchases:', error);
    return [];
  }

  return (data ?? []) as GuestPurchase[];
}

/**
 * Link guest purchases to a newly created user account
 * Creates access grants for all pending purchases
 */
export async function linkGuestPurchases(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<AccessGrant[]> {
  // Get pending guest purchases for this email
  const guestPurchases = await getGuestPurchasesByEmail(supabase, email);

  if (guestPurchases.length === 0) {
    return [];
  }

  const grants: AccessGrant[] = [];

  for (const purchase of guestPurchases) {
    // Create access grant for this purchase
    const grant = await grantAccess(supabase, userId, purchase.company_slug, purchase.role_slug, {
      source: 'purchase',
    });
    grants.push(grant);

    // Mark the guest purchase as linked
    await supabase
      .from('guest_purchases')
      .update({
        linked_user_id: userId,
        linked_at: new Date().toISOString(),
      })
      .eq('id', purchase.id);
  }

  return grants;
}

/**
 * Check if an email has pending guest purchases
 */
export async function hasPendingGuestPurchases(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const purchases = await getGuestPurchasesByEmail(supabase, email);
  return purchases.length > 0;
}
