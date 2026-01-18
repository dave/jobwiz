/**
 * Tests for access storage functions
 * Issue: #40 - Purchase unlock flow
 */

import {
  grantAccess,
  hasAccess,
  checkAccess,
  revokeAccess,
  getAccessGrant,
  getUserAccessGrants,
  grantBundleAccess,
  revokeBundleAccess,
  createGuestPurchase,
  getGuestPurchasesByEmail,
  linkGuestPurchases,
  hasPendingGuestPurchases,
} from '../storage';
import type { AccessGrant, GuestPurchase } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client factory
function createMockSupabase(overrides: Partial<MockSupabaseConfig> = {}) {
  const config: MockSupabaseConfig = {
    accessGrants: [],
    guestPurchases: [],
    insertError: null,
    selectError: null,
    updateError: null,
    ...overrides,
  };

  const mockSupabase = {
    from: jest.fn((table: string) => {
      if (table === 'access_grants') {
        return createAccessGrantsQueryBuilder(config);
      }
      if (table === 'guest_purchases') {
        return createGuestPurchasesQueryBuilder(config);
      }
      return createGenericQueryBuilder();
    }),
  };

  return mockSupabase as unknown as SupabaseClient;
}

interface MockSupabaseConfig {
  accessGrants: AccessGrant[];
  guestPurchases: GuestPurchase[];
  insertError: Error | null;
  selectError: Error | null;
  updateError: Error | null;
}

// Access grants query builder mock
function createAccessGrantsQueryBuilder(config: MockSupabaseConfig) {
  let filters: Record<string, unknown> = {};
  let isNullFilters: string[] = [];
  let orderBy: string | null = null;
  let orderAsc = true;
  let gteFilters: Record<string, unknown> = {};

  const builder = {
    insert: jest.fn((data: unknown) => {
      if (config.insertError) {
        return {
          select: () => ({
            single: () => Promise.resolve({ data: null, error: config.insertError }),
          }),
        };
      }
      const newGrant: AccessGrant = {
        id: `grant-${Date.now()}`,
        user_id: (data as Record<string, unknown>).user_id as string,
        company_slug: (data as Record<string, unknown>).company_slug as string | null,
        role_slug: (data as Record<string, unknown>).role_slug as string | null,
        granted_at: new Date().toISOString(),
        expires_at: (data as Record<string, unknown>).expires_at as string,
        purchase_id: (data as Record<string, unknown>).purchase_id as string | null,
        source: (data as Record<string, unknown>).source as AccessGrant['source'],
        created_at: new Date().toISOString(),
      };
      config.accessGrants.push(newGrant);
      return {
        select: () => ({
          single: () => Promise.resolve({ data: newGrant, error: null }),
        }),
      };
    }),
    select: jest.fn(() => builder),
    update: jest.fn((data: unknown) => {
      if (config.updateError) {
        return builder;
      }
      // Update matching grants
      const matching = config.accessGrants.filter((g) => {
        if (filters.user_id && g.user_id !== filters.user_id) return false;
        if (filters.company_slug !== undefined && g.company_slug !== filters.company_slug) return false;
        if (isNullFilters.includes('company_slug') && g.company_slug !== null) return false;
        if (filters.role_slug !== undefined && g.role_slug !== filters.role_slug) return false;
        if (isNullFilters.includes('role_slug') && g.role_slug !== null) return false;
        return true;
      });
      for (const grant of matching) {
        Object.assign(grant, data);
      }
      return builder;
    }),
    eq: jest.fn((field: string, value: unknown) => {
      filters[field] = value;
      return builder;
    }),
    is: jest.fn((field: string, value: unknown) => {
      if (value === null) {
        isNullFilters.push(field);
      }
      return builder;
    }),
    gte: jest.fn((field: string, value: unknown) => {
      gteFilters[field] = value;
      return builder;
    }),
    order: jest.fn((field: string, options?: { ascending: boolean }) => {
      orderBy = field;
      orderAsc = options?.ascending ?? true;
      return builder;
    }),
    maybeSingle: jest.fn(() => {
      if (config.selectError) {
        return Promise.resolve({ data: null, error: config.selectError });
      }
      const matching = config.accessGrants.find((g) => {
        if (filters.user_id && g.user_id !== filters.user_id) return false;
        if (filters.company_slug !== undefined && g.company_slug !== filters.company_slug) return false;
        if (isNullFilters.includes('company_slug') && g.company_slug !== null) return false;
        if (filters.role_slug !== undefined && g.role_slug !== filters.role_slug) return false;
        if (isNullFilters.includes('role_slug') && g.role_slug !== null) return false;
        return true;
      });
      return Promise.resolve({ data: matching ?? null, error: null });
    }),
    then: (resolve: (result: { data: AccessGrant[] | null; error: Error | null }) => void) => {
      if (config.selectError) {
        resolve({ data: null, error: config.selectError });
        return;
      }
      let result = config.accessGrants.filter((g) => {
        if (filters.user_id && g.user_id !== filters.user_id) return false;
        if (gteFilters.expires_at) {
          const gteDate = new Date(gteFilters.expires_at as string);
          const expiresDate = new Date(g.expires_at);
          if (expiresDate < gteDate) return false;
        }
        return true;
      });
      if (orderBy) {
        result = [...result].sort((a, b) => {
          const aVal = a[orderBy as keyof AccessGrant] as string;
          const bVal = b[orderBy as keyof AccessGrant] as string;
          return orderAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
      }
      resolve({ data: result, error: null });
    },
  };

  return builder;
}

// Guest purchases query builder mock
function createGuestPurchasesQueryBuilder(config: MockSupabaseConfig) {
  let filters: Record<string, unknown> = {};
  let isNullFilters: string[] = [];
  let orderBy: string | null = null;
  let orderAsc = true;

  const builder = {
    insert: jest.fn((data: unknown) => {
      if (config.insertError) {
        return {
          select: () => ({
            single: () => Promise.resolve({ data: null, error: config.insertError }),
          }),
        };
      }
      const newPurchase: GuestPurchase = {
        id: `guest-${Date.now()}`,
        email: (data as Record<string, unknown>).email as string,
        stripe_session_id: (data as Record<string, unknown>).stripe_session_id as string,
        company_slug: (data as Record<string, unknown>).company_slug as string,
        role_slug: (data as Record<string, unknown>).role_slug as string,
        amount: (data as Record<string, unknown>).amount as number,
        currency: (data as Record<string, unknown>).currency as string,
        linked_user_id: null,
        linked_at: null,
        created_at: new Date().toISOString(),
      };
      config.guestPurchases.push(newPurchase);
      return {
        select: () => ({
          single: () => Promise.resolve({ data: newPurchase, error: null }),
        }),
      };
    }),
    select: jest.fn(() => builder),
    update: jest.fn((data: unknown) => {
      // Update matching purchases
      const matching = config.guestPurchases.filter((p) => {
        if (filters.id && p.id !== filters.id) return false;
        return true;
      });
      for (const purchase of matching) {
        Object.assign(purchase, data);
      }
      return builder;
    }),
    eq: jest.fn((field: string, value: unknown) => {
      filters[field] = value;
      return builder;
    }),
    is: jest.fn((field: string, value: unknown) => {
      if (value === null) {
        isNullFilters.push(field);
      }
      return builder;
    }),
    order: jest.fn((field: string, options?: { ascending: boolean }) => {
      orderBy = field;
      orderAsc = options?.ascending ?? true;
      return builder;
    }),
    then: (resolve: (result: { data: GuestPurchase[] | null; error: Error | null }) => void) => {
      if (config.selectError) {
        resolve({ data: null, error: config.selectError });
        return;
      }
      let result = config.guestPurchases.filter((p) => {
        if (filters.email && p.email !== filters.email) return false;
        if (isNullFilters.includes('linked_user_id') && p.linked_user_id !== null) return false;
        return true;
      });
      if (orderBy) {
        result = [...result].sort((a, b) => {
          const aVal = a[orderBy as keyof GuestPurchase] as string;
          const bVal = b[orderBy as keyof GuestPurchase] as string;
          return orderAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
      }
      resolve({ data: result, error: null });
    },
  };

  return builder;
}

function createGenericQueryBuilder() {
  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('grantAccess', () => {
  test('creates access grant record', async () => {
    const supabase = createMockSupabase();
    const grant = await grantAccess(supabase, 'user-123', 'google', 'software-engineer');

    expect(grant.user_id).toBe('user-123');
    expect(grant.company_slug).toBe('google');
    expect(grant.role_slug).toBe('software-engineer');
    expect(grant.source).toBe('purchase');
  });

  test('creates grant with custom options', async () => {
    const supabase = createMockSupabase();
    const grant = await grantAccess(supabase, 'user-123', 'google', 'software-engineer', {
      purchaseId: 'purchase-456',
      source: 'admin',
    });

    expect(grant.purchase_id).toBe('purchase-456');
    expect(grant.source).toBe('admin');
  });

  test('creates grant with null company for role bundle', async () => {
    const supabase = createMockSupabase();
    const grant = await grantAccess(supabase, 'user-123', null, 'software-engineer');

    expect(grant.company_slug).toBeNull();
    expect(grant.role_slug).toBe('software-engineer');
  });

  test('creates grant with null role for company bundle', async () => {
    const supabase = createMockSupabase();
    const grant = await grantAccess(supabase, 'user-123', 'google', null);

    expect(grant.company_slug).toBe('google');
    expect(grant.role_slug).toBeNull();
  });

  test('creates grant with both null for full access', async () => {
    const supabase = createMockSupabase();
    const grant = await grantAccess(supabase, 'user-123', null, null);

    expect(grant.company_slug).toBeNull();
    expect(grant.role_slug).toBeNull();
  });

  test('throws error on database failure', async () => {
    const supabase = createMockSupabase({
      insertError: { code: '42000', message: 'Database error' } as unknown as Error,
    });

    await expect(
      grantAccess(supabase, 'user-123', 'google', 'software-engineer')
    ).rejects.toThrow('Failed to grant access');
  });
});

describe('hasAccess', () => {
  test('returns true after grant', async () => {
    const supabase = createMockSupabase();
    await grantAccess(supabase, 'user-123', 'google', 'software-engineer');

    const result = await hasAccess(supabase, 'user-123', 'google', 'software-engineer');
    expect(result).toBe(true);
  });

  test('returns false without grant', async () => {
    const supabase = createMockSupabase();

    const result = await hasAccess(supabase, 'user-123', 'google', 'software-engineer');
    expect(result).toBe(false);
  });

  test('returns false for different company', async () => {
    const supabase = createMockSupabase();
    await grantAccess(supabase, 'user-123', 'google', 'software-engineer');

    const result = await hasAccess(supabase, 'user-123', 'amazon', 'software-engineer');
    expect(result).toBe(false);
  });

  test('returns false for different role', async () => {
    const supabase = createMockSupabase();
    await grantAccess(supabase, 'user-123', 'google', 'software-engineer');

    const result = await hasAccess(supabase, 'user-123', 'google', 'product-manager');
    expect(result).toBe(false);
  });
});

describe('checkAccess', () => {
  test('returns detailed result for exact match', async () => {
    const supabase = createMockSupabase();
    await grantAccess(supabase, 'user-123', 'google', 'software-engineer');

    const result = await checkAccess(supabase, 'user-123', 'google', 'software-engineer');
    expect(result.hasAccess).toBe(true);
    expect(result.userId).toBe('user-123');
    expect(result.grantId).toBeDefined();
    expect(result.expiresAt).toBeDefined();
    expect(result.source).toBe('purchase');
  });

  test('returns company bundle match for any role', async () => {
    const supabase = createMockSupabase();
    await grantAccess(supabase, 'user-123', 'google', null);

    const result = await checkAccess(supabase, 'user-123', 'google', 'product-manager');
    expect(result.hasAccess).toBe(true);
  });

  test('returns role bundle match for any company', async () => {
    const supabase = createMockSupabase();
    await grantAccess(supabase, 'user-123', null, 'software-engineer');

    const result = await checkAccess(supabase, 'user-123', 'amazon', 'software-engineer');
    expect(result.hasAccess).toBe(true);
  });

  test('returns full access match for any position', async () => {
    const supabase = createMockSupabase();
    await grantAccess(supabase, 'user-123', null, null);

    const result1 = await checkAccess(supabase, 'user-123', 'google', 'software-engineer');
    expect(result1.hasAccess).toBe(true);

    const result2 = await checkAccess(supabase, 'user-123', 'amazon', 'product-manager');
    expect(result2.hasAccess).toBe(true);
  });
});

describe('revokeAccess', () => {
  test('revokes access by setting expires_at', async () => {
    const accessGrants: AccessGrant[] = [{
      id: 'grant-1',
      user_id: 'user-123',
      company_slug: 'google',
      role_slug: 'software-engineer',
      granted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      purchase_id: null,
      source: 'purchase',
      created_at: new Date().toISOString(),
    }];

    const supabase = createMockSupabase({ accessGrants });

    await revokeAccess(supabase, 'user-123', 'google', 'software-engineer');

    // The grant should be updated
    expect(accessGrants[0].source).toBe('refund_revoke');
  });
});

describe('getUserAccessGrants', () => {
  test('returns all grants for user', async () => {
    const supabase = createMockSupabase();
    await grantAccess(supabase, 'user-123', 'google', 'software-engineer');
    await grantAccess(supabase, 'user-123', 'amazon', 'product-manager');

    const grants = await getUserAccessGrants(supabase, 'user-123');
    expect(grants.length).toBe(2);
  });

  test('returns empty array for user with no grants', async () => {
    const supabase = createMockSupabase();

    const grants = await getUserAccessGrants(supabase, 'user-456');
    expect(grants).toEqual([]);
  });
});

describe('grantBundleAccess', () => {
  test('creates single access grant', async () => {
    const supabase = createMockSupabase();
    const grants = await grantBundleAccess(supabase, {
      userId: 'user-123',
      accessType: 'single',
      companySlug: 'google',
      roleSlug: 'software-engineer',
    });

    expect(grants.length).toBe(1);
    expect(grants[0].company_slug).toBe('google');
    expect(grants[0].role_slug).toBe('software-engineer');
  });

  test('creates company bundle grant', async () => {
    const supabase = createMockSupabase();
    const grants = await grantBundleAccess(supabase, {
      userId: 'user-123',
      accessType: 'company_bundle',
      companySlug: 'google',
    });

    expect(grants.length).toBe(1);
    expect(grants[0].company_slug).toBe('google');
    expect(grants[0].role_slug).toBeNull();
  });

  test('creates role bundle grant', async () => {
    const supabase = createMockSupabase();
    const grants = await grantBundleAccess(supabase, {
      userId: 'user-123',
      accessType: 'role_bundle',
      roleSlug: 'software-engineer',
    });

    expect(grants.length).toBe(1);
    expect(grants[0].company_slug).toBeNull();
    expect(grants[0].role_slug).toBe('software-engineer');
  });

  test('creates full access grant', async () => {
    const supabase = createMockSupabase();
    const grants = await grantBundleAccess(supabase, {
      userId: 'user-123',
      accessType: 'full',
    });

    expect(grants.length).toBe(1);
    expect(grants[0].company_slug).toBeNull();
    expect(grants[0].role_slug).toBeNull();
  });

  test('throws error for single without company', async () => {
    const supabase = createMockSupabase();
    await expect(
      grantBundleAccess(supabase, {
        userId: 'user-123',
        accessType: 'single',
        roleSlug: 'software-engineer',
      })
    ).rejects.toThrow('Single access requires both company_slug and role_slug');
  });

  test('throws error for single without role', async () => {
    const supabase = createMockSupabase();
    await expect(
      grantBundleAccess(supabase, {
        userId: 'user-123',
        accessType: 'single',
        companySlug: 'google',
      })
    ).rejects.toThrow('Single access requires both company_slug and role_slug');
  });

  test('throws error for company_bundle without company', async () => {
    const supabase = createMockSupabase();
    await expect(
      grantBundleAccess(supabase, {
        userId: 'user-123',
        accessType: 'company_bundle',
      })
    ).rejects.toThrow('Company bundle requires company_slug');
  });

  test('throws error for role_bundle without role', async () => {
    const supabase = createMockSupabase();
    await expect(
      grantBundleAccess(supabase, {
        userId: 'user-123',
        accessType: 'role_bundle',
      })
    ).rejects.toThrow('Role bundle requires role_slug');
  });
});

describe('revokeBundleAccess', () => {
  test('revokes single access', async () => {
    const accessGrants: AccessGrant[] = [{
      id: 'grant-1',
      user_id: 'user-123',
      company_slug: 'google',
      role_slug: 'software-engineer',
      granted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      purchase_id: null,
      source: 'purchase',
      created_at: new Date().toISOString(),
    }];

    const supabase = createMockSupabase({ accessGrants });

    await revokeBundleAccess(supabase, 'user-123', 'single', 'google', 'software-engineer');
    expect(accessGrants[0].source).toBe('refund_revoke');
  });

  test('throws error for single without company', async () => {
    const supabase = createMockSupabase();
    await expect(
      revokeBundleAccess(supabase, 'user-123', 'single', undefined, 'software-engineer')
    ).rejects.toThrow('Single access requires both company_slug and role_slug');
  });
});

describe('createGuestPurchase', () => {
  test('creates guest purchase record', async () => {
    const supabase = createMockSupabase();
    const purchase = await createGuestPurchase(supabase, {
      email: 'Test@Example.com',
      stripeSessionId: 'cs_test_123',
      companySlug: 'google',
      roleSlug: 'software-engineer',
      amount: 20000,
      currency: 'usd',
    });

    expect(purchase.email).toBe('test@example.com');
    expect(purchase.stripe_session_id).toBe('cs_test_123');
    expect(purchase.company_slug).toBe('google');
    expect(purchase.role_slug).toBe('software-engineer');
    expect(purchase.amount).toBe(20000);
    expect(purchase.linked_user_id).toBeNull();
  });
});

describe('getGuestPurchasesByEmail', () => {
  test('returns pending guest purchases', async () => {
    const guestPurchases: GuestPurchase[] = [
      {
        id: 'guest-1',
        email: 'test@example.com',
        stripe_session_id: 'cs_test_123',
        company_slug: 'google',
        role_slug: 'software-engineer',
        amount: 20000,
        currency: 'usd',
        linked_user_id: null,
        linked_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'guest-2',
        email: 'test@example.com',
        stripe_session_id: 'cs_test_456',
        company_slug: 'amazon',
        role_slug: 'product-manager',
        amount: 20000,
        currency: 'usd',
        linked_user_id: 'user-old', // Already linked
        linked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const supabase = createMockSupabase({ guestPurchases });

    const purchases = await getGuestPurchasesByEmail(supabase, 'test@example.com');
    expect(purchases.length).toBe(1);
    expect(purchases[0].id).toBe('guest-1');
  });
});

describe('linkGuestPurchases', () => {
  test('links guest purchases and creates access grants', async () => {
    const guestPurchases: GuestPurchase[] = [{
      id: 'guest-1',
      email: 'test@example.com',
      stripe_session_id: 'cs_test_123',
      company_slug: 'google',
      role_slug: 'software-engineer',
      amount: 20000,
      currency: 'usd',
      linked_user_id: null,
      linked_at: null,
      created_at: new Date().toISOString(),
    }];

    const supabase = createMockSupabase({ guestPurchases });

    const grants = await linkGuestPurchases(supabase, 'user-123', 'test@example.com');

    expect(grants.length).toBe(1);
    expect(grants[0].user_id).toBe('user-123');
    expect(grants[0].company_slug).toBe('google');
    expect(grants[0].role_slug).toBe('software-engineer');
  });

  test('returns empty array when no pending purchases', async () => {
    const supabase = createMockSupabase();

    const grants = await linkGuestPurchases(supabase, 'user-123', 'test@example.com');
    expect(grants).toEqual([]);
  });
});

describe('hasPendingGuestPurchases', () => {
  test('returns true when pending purchases exist', async () => {
    const guestPurchases: GuestPurchase[] = [{
      id: 'guest-1',
      email: 'test@example.com',
      stripe_session_id: 'cs_test_123',
      company_slug: 'google',
      role_slug: 'software-engineer',
      amount: 20000,
      currency: 'usd',
      linked_user_id: null,
      linked_at: null,
      created_at: new Date().toISOString(),
    }];

    const supabase = createMockSupabase({ guestPurchases });

    const result = await hasPendingGuestPurchases(supabase, 'test@example.com');
    expect(result).toBe(true);
  });

  test('returns false when no pending purchases', async () => {
    const supabase = createMockSupabase();

    const result = await hasPendingGuestPurchases(supabase, 'test@example.com');
    expect(result).toBe(false);
  });
});

// ============================================================================
// RLS Integration Tests (conceptual - would need real Supabase)
// ============================================================================

describe('RLS integration (conceptual)', () => {
  test('user can access content after purchase', async () => {
    const supabase = createMockSupabase();

    // Grant access
    await grantAccess(supabase, 'user-123', 'google', 'software-engineer');

    // Check access
    const result = await hasAccess(supabase, 'user-123', 'google', 'software-engineer');
    expect(result).toBe(true);
  });

  test('user cannot access without purchase', async () => {
    const supabase = createMockSupabase();

    // No grant created

    // Check access
    const result = await hasAccess(supabase, 'user-123', 'google', 'software-engineer');
    expect(result).toBe(false);
  });
});
