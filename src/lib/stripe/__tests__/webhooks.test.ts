/**
 * Tests for Stripe webhook functions
 * Issue: #38 - Stripe webhook handlers
 */

import type Stripe from 'stripe';
import {
  extractSessionMetadata,
  purchaseExists,
  createPurchase,
  createAccessGrant,
  revokeAccessGrant,
  updatePurchaseStatus,
  processCheckoutCompleted,
  processChargeRefunded,
  processWebhookEvent,
} from '../webhooks';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
};

const createMockSupabase = () => {
  const mock = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
  };
  return mock;
};

describe('extractSessionMetadata', () => {
  it('extracts all metadata fields', () => {
    const session = {
      id: 'cs_test_123',
      metadata: {
        user_id: 'user_abc',
        company_slug: 'google',
        role_slug: 'software-engineer',
      },
    } as unknown as Stripe.Checkout.Session;

    const result = extractSessionMetadata(session);
    expect(result).toEqual({
      userId: 'user_abc',
      companySlug: 'google',
      roleSlug: 'software-engineer',
    });
  });

  it('returns nulls for missing metadata', () => {
    const session = {
      id: 'cs_test_123',
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    const result = extractSessionMetadata(session);
    expect(result).toEqual({
      userId: null,
      companySlug: null,
      roleSlug: null,
    });
  });

  it('handles null metadata', () => {
    const session = {
      id: 'cs_test_123',
      metadata: null,
    } as unknown as Stripe.Checkout.Session;

    const result = extractSessionMetadata(session);
    expect(result).toEqual({
      userId: null,
      companySlug: null,
      roleSlug: null,
    });
  });

  it('handles undefined metadata', () => {
    const session = {
      id: 'cs_test_123',
    } as unknown as Stripe.Checkout.Session;

    const result = extractSessionMetadata(session);
    expect(result).toEqual({
      userId: null,
      companySlug: null,
      roleSlug: null,
    });
  });
});

describe('purchaseExists', () => {
  it('returns true when purchase exists', async () => {
    const mock = createMockSupabase();
    mock.maybeSingle.mockResolvedValue({ data: { id: 'purchase_123' }, error: null });
    mock.from = jest.fn().mockReturnValue(mock);

    const result = await purchaseExists(mock as any, 'cs_test_123');
    expect(result).toBe(true);
    expect(mock.from).toHaveBeenCalledWith('purchases');
    expect(mock.eq).toHaveBeenCalledWith('stripe_session_id', 'cs_test_123');
  });

  it('returns false when purchase does not exist', async () => {
    const mock = createMockSupabase();
    mock.maybeSingle.mockResolvedValue({ data: null, error: null });
    mock.from = jest.fn().mockReturnValue(mock);

    const result = await purchaseExists(mock as any, 'cs_test_123');
    expect(result).toBe(false);
  });

  it('returns false on database error', async () => {
    const mock = createMockSupabase();
    mock.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    mock.from = jest.fn().mockReturnValue(mock);

    const result = await purchaseExists(mock as any, 'cs_test_123');
    expect(result).toBe(false);
  });
});

describe('createPurchase', () => {
  it('creates purchase with all fields', async () => {
    const mockPurchase = {
      id: 'purchase_123',
      user_id: 'user_abc',
      stripe_session_id: 'cs_test_123',
      stripe_payment_intent_id: 'pi_123',
      amount: 20000,
      currency: 'usd',
      company_slug: 'google',
      role_slug: 'software-engineer',
      status: 'completed',
      metadata: { customer_email: 'test@example.com' },
      created_at: '2026-01-18T00:00:00Z',
      updated_at: '2026-01-18T00:00:00Z',
    };

    const mock = createMockSupabase();
    mock.single.mockResolvedValue({ data: mockPurchase, error: null });
    mock.from = jest.fn().mockReturnValue(mock);

    const result = await createPurchase(mock as any, {
      user_id: 'user_abc',
      stripe_session_id: 'cs_test_123',
      stripe_payment_intent_id: 'pi_123',
      amount: 20000,
      currency: 'usd',
      company_slug: 'google',
      role_slug: 'software-engineer',
      metadata: { customer_email: 'test@example.com' },
    });

    expect(result).toEqual(mockPurchase);
    expect(mock.from).toHaveBeenCalledWith('purchases');
    expect(mock.insert).toHaveBeenCalled();
  });

  it('throws error on database failure', async () => {
    const mock = createMockSupabase();
    mock.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    mock.from = jest.fn().mockReturnValue(mock);

    await expect(
      createPurchase(mock as any, {
        user_id: 'user_abc',
        stripe_session_id: 'cs_test_123',
        amount: 20000,
        currency: 'usd',
        company_slug: 'google',
        role_slug: 'software-engineer',
      })
    ).rejects.toThrow('Failed to create purchase: Insert failed');
  });

  it('handles missing optional payment_intent_id', async () => {
    const mockPurchase = {
      id: 'purchase_123',
      user_id: 'user_abc',
      stripe_session_id: 'cs_test_123',
      stripe_payment_intent_id: null,
      amount: 20000,
      currency: 'usd',
      company_slug: 'google',
      role_slug: 'software-engineer',
      status: 'completed',
      metadata: {},
      created_at: '2026-01-18T00:00:00Z',
      updated_at: '2026-01-18T00:00:00Z',
    };

    const mock = createMockSupabase();
    mock.single.mockResolvedValue({ data: mockPurchase, error: null });
    mock.from = jest.fn().mockReturnValue(mock);

    const result = await createPurchase(mock as any, {
      user_id: 'user_abc',
      stripe_session_id: 'cs_test_123',
      amount: 20000,
      currency: 'usd',
      company_slug: 'google',
      role_slug: 'software-engineer',
    });

    expect(result.stripe_payment_intent_id).toBeNull();
  });
});

describe('createAccessGrant', () => {
  it('creates access grant with purchase reference', async () => {
    const mockGrant = {
      id: 'grant_123',
      user_id: 'user_abc',
      company_slug: 'google',
      role_slug: 'software-engineer',
      granted_at: '2026-01-18T00:00:00Z',
      expires_at: '2126-01-18T00:00:00Z',
      purchase_id: 'purchase_123',
      source: 'purchase',
      created_at: '2026-01-18T00:00:00Z',
    };

    const mock = createMockSupabase();
    mock.single.mockResolvedValue({ data: mockGrant, error: null });
    mock.from = jest.fn().mockReturnValue(mock);

    const result = await createAccessGrant(mock as any, {
      user_id: 'user_abc',
      company_slug: 'google',
      role_slug: 'software-engineer',
      purchase_id: 'purchase_123',
      source: 'purchase',
    });

    expect(result).toEqual(mockGrant);
    expect(mock.from).toHaveBeenCalledWith('access_grants');
  });

  it('throws error for duplicate access grant', async () => {
    const mock = createMockSupabase();
    mock.single.mockResolvedValue({ data: null, error: { code: '23505', message: 'Unique violation' } });
    mock.from = jest.fn().mockReturnValue(mock);

    await expect(
      createAccessGrant(mock as any, {
        user_id: 'user_abc',
        company_slug: 'google',
        role_slug: 'software-engineer',
      })
    ).rejects.toThrow('Access grant already exists for this user and company/role');
  });

  it('throws error on database failure', async () => {
    const mock = createMockSupabase();
    mock.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    mock.from = jest.fn().mockReturnValue(mock);

    await expect(
      createAccessGrant(mock as any, {
        user_id: 'user_abc',
        company_slug: 'google',
        role_slug: 'software-engineer',
      })
    ).rejects.toThrow('Failed to create access grant: Insert failed');
  });
});

describe('revokeAccessGrant', () => {
  it('deletes access grant', async () => {
    const deleteMock = jest.fn();
    const mock = {
      from: jest.fn().mockReturnValue({
        delete: deleteMock.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      }),
    };

    await revokeAccessGrant(mock as any, 'user_abc', 'google', 'software-engineer');

    expect(mock.from).toHaveBeenCalledWith('access_grants');
    expect(deleteMock).toHaveBeenCalled();
  });

  it('throws error on database failure', async () => {
    const mock = {
      from: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
            }),
          }),
        }),
      }),
    };

    await expect(
      revokeAccessGrant(mock as any, 'user_abc', 'google', 'software-engineer')
    ).rejects.toThrow('Failed to revoke access grant: Delete failed');
  });
});

describe('updatePurchaseStatus', () => {
  it('updates purchase status', async () => {
    const updateMock = jest.fn();
    const mock = {
      from: jest.fn().mockReturnValue({
        update: updateMock.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    await updatePurchaseStatus(mock as any, 'cs_test_123', 'refunded');

    expect(mock.from).toHaveBeenCalledWith('purchases');
    expect(updateMock).toHaveBeenCalledWith({ status: 'refunded' });
  });

  it('throws error on database failure', async () => {
    const mock = {
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      }),
    };

    await expect(
      updatePurchaseStatus(mock as any, 'cs_test_123', 'refunded')
    ).rejects.toThrow('Failed to update purchase status: Update failed');
  });
});

describe('processCheckoutCompleted', () => {
  it('creates purchase and access grant on valid session', async () => {
    const session = {
      id: 'cs_test_123',
      payment_intent: 'pi_123',
      amount_total: 20000,
      currency: 'usd',
      customer_email: 'test@example.com',
      payment_status: 'paid',
      metadata: {
        user_id: 'user_abc',
        company_slug: 'google',
        role_slug: 'software-engineer',
      },
    } as unknown as Stripe.Checkout.Session;

    // Create separate mocks for different table calls
    const purchaseMock = createMockSupabase();
    purchaseMock.maybeSingle.mockResolvedValue({ data: null, error: null }); // purchase doesn't exist
    purchaseMock.single.mockResolvedValue({
      data: { id: 'purchase_123' },
      error: null,
    });

    const accessGrantMock = createMockSupabase();
    accessGrantMock.single.mockResolvedValue({
      data: { id: 'grant_123' },
      error: null,
    });

    let callCount = 0;
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'purchases') {
          callCount++;
          // First call is existence check (select), second is insert
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'purchase_123' },
              error: null,
            }),
          };
        }
        if (table === 'access_grants') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'grant_123' },
              error: null,
            }),
          };
        }
        return purchaseMock;
      }),
    };

    const result = await processCheckoutCompleted(mockSupabase as any, session);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Purchase and access grant created successfully');
    expect(result.purchase_id).toBe('purchase_123');
    expect(result.access_grant_id).toBe('grant_123');
  });

  it('returns idempotent success for existing purchase', async () => {
    const session = {
      id: 'cs_test_123',
      metadata: {
        user_id: 'user_abc',
        company_slug: 'google',
        role_slug: 'software-engineer',
      },
    } as unknown as Stripe.Checkout.Session;

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'purchase_123' },
          error: null,
        }),
      }),
    };

    const result = await processCheckoutCompleted(mockSupabase as any, session);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Purchase already exists (idempotent)');
  });

  it('fails when user_id is missing', async () => {
    const session = {
      id: 'cs_test_123',
      metadata: {
        company_slug: 'google',
        role_slug: 'software-engineer',
      },
    } as unknown as Stripe.Checkout.Session;

    const mockSupabase = {} as any;

    const result = await processCheckoutCompleted(mockSupabase, session);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Missing user_id in session metadata');
  });

  it('fails when company_slug is missing', async () => {
    const session = {
      id: 'cs_test_123',
      metadata: {
        user_id: 'user_abc',
        role_slug: 'software-engineer',
      },
    } as unknown as Stripe.Checkout.Session;

    const mockSupabase = {} as any;

    const result = await processCheckoutCompleted(mockSupabase, session);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Missing company_slug or role_slug in session metadata');
  });

  it('fails when role_slug is missing', async () => {
    const session = {
      id: 'cs_test_123',
      metadata: {
        user_id: 'user_abc',
        company_slug: 'google',
      },
    } as unknown as Stripe.Checkout.Session;

    const mockSupabase = {} as any;

    const result = await processCheckoutCompleted(mockSupabase, session);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Missing company_slug or role_slug in session metadata');
  });

  it('handles string payment_intent', async () => {
    const session = {
      id: 'cs_test_123',
      payment_intent: 'pi_string_123',
      amount_total: 20000,
      currency: 'usd',
      metadata: {
        user_id: 'user_abc',
        company_slug: 'google',
        role_slug: 'software-engineer',
      },
    } as unknown as Stripe.Checkout.Session;

    let insertedData: any = null;
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'purchases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockImplementation((data) => {
              insertedData = data;
              return {
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                  data: { id: 'purchase_123', ...data },
                  error: null,
                }),
              };
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'grant_123' },
            error: null,
          }),
        };
      }),
    };

    await processCheckoutCompleted(mockSupabase as any, session);
    expect(insertedData?.stripe_payment_intent_id).toBe('pi_string_123');
  });

  it('handles object payment_intent', async () => {
    const session = {
      id: 'cs_test_123',
      payment_intent: { id: 'pi_object_123' },
      amount_total: 20000,
      currency: 'usd',
      metadata: {
        user_id: 'user_abc',
        company_slug: 'google',
        role_slug: 'software-engineer',
      },
    } as unknown as Stripe.Checkout.Session;

    let insertedData: any = null;
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'purchases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockImplementation((data) => {
              insertedData = data;
              return {
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                  data: { id: 'purchase_123', ...data },
                  error: null,
                }),
              };
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'grant_123' },
            error: null,
          }),
        };
      }),
    };

    await processCheckoutCompleted(mockSupabase as any, session);
    expect(insertedData?.stripe_payment_intent_id).toBe('pi_object_123');
  });
});

describe('processChargeRefunded', () => {
  it('revokes access and updates purchase on refund', async () => {
    const charge = {
      id: 'ch_123',
      payment_intent: 'pi_123',
    } as unknown as Stripe.Charge;

    const mockPurchase = {
      id: 'purchase_123',
      user_id: 'user_abc',
      company_slug: 'google',
      role_slug: 'software-engineer',
      stripe_session_id: 'cs_test_123',
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'purchases') {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockPurchase,
                error: null,
              }),
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return {
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          })),
        };
      }),
    };

    const result = await processChargeRefunded(mockSupabase as any, charge);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Purchase marked as refunded and access revoked');
    expect(result.purchase_id).toBe('purchase_123');
  });

  it('fails when payment_intent is missing', async () => {
    const charge = {
      id: 'ch_123',
      payment_intent: null,
    } as unknown as Stripe.Charge;

    const result = await processChargeRefunded({} as any, charge);

    expect(result.success).toBe(false);
    expect(result.message).toBe('No payment_intent associated with charge');
  });

  it('fails when purchase not found', async () => {
    const charge = {
      id: 'ch_123',
      payment_intent: 'pi_123',
    } as unknown as Stripe.Charge;

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    };

    const result = await processChargeRefunded(mockSupabase as any, charge);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Could not find purchase for refunded charge');
  });
});

describe('processWebhookEvent', () => {
  it('processes checkout.session.completed event', async () => {
    const event = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_intent: 'pi_123',
          amount_total: 20000,
          currency: 'usd',
          metadata: {
            user_id: 'user_abc',
            company_slug: 'google',
            role_slug: 'software-engineer',
          },
        },
      },
    } as unknown as Stripe.Event;

    // Create mock that handles all operations
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'purchases') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'purchase_123' },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'grant_123' },
            error: null,
          }),
        };
      }),
    };

    const result = await processWebhookEvent(mockSupabase as any, event);
    expect(result.event_type).toBe('checkout.session.completed');
  });

  it('processes charge.refunded event', async () => {
    const event = {
      id: 'evt_123',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_123',
          payment_intent: null, // Will cause a failure
        },
      },
    } as unknown as Stripe.Event;

    const result = await processWebhookEvent({} as any, event);
    expect(result.event_type).toBe('charge.refunded');
    expect(result.success).toBe(false);
  });

  it('handles unrecognized event types gracefully', async () => {
    const event = {
      id: 'evt_123',
      type: 'customer.subscription.created',
      data: {
        object: {},
      },
    } as unknown as Stripe.Event;

    const result = await processWebhookEvent({} as any, event);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Event type customer.subscription.created not handled');
  });
});

describe('getWebhookSecret', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws error when STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { getWebhookSecret } = await import('../webhooks');
    expect(() => getWebhookSecret()).toThrow('STRIPE_WEBHOOK_SECRET environment variable is not set');
  });

  it('returns secret when set', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    const { getWebhookSecret } = await import('../webhooks');
    expect(getWebhookSecret()).toBe('whsec_test123');
  });
});
