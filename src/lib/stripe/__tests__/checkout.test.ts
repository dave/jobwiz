/**
 * Tests for Stripe checkout functions
 */
import { validateCheckoutRequest } from '../checkout';

// Note: createCheckoutSession and getCheckoutSession require actual Stripe API
// and are tested via integration tests or with proper Stripe test keys

describe('validateCheckoutRequest', () => {
  describe('valid requests', () => {
    it('accepts valid request with required fields', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.request).toEqual({
          product_id: 'price_123',
          company_slug: 'google',
          role_slug: 'software-engineer',
          success_url: undefined,
          cancel_url: undefined,
        });
      }
    });

    it('accepts request with optional URLs', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google',
        role_slug: 'software-engineer',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.request.success_url).toBe('https://example.com/success');
        expect(result.request.cancel_url).toBe('https://example.com/cancel');
      }
    });

    it('accepts slugs with hyphens', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'goldman-sachs',
        role_slug: 'data-scientist',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(true);
    });

    it('accepts single-word slugs', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google',
        role_slug: 'pm',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid requests', () => {
    it('rejects null body', () => {
      const result = validateCheckoutRequest(null);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Request body is required');
      }
    });

    it('rejects undefined body', () => {
      const result = validateCheckoutRequest(undefined);
      expect(result.valid).toBe(false);
    });

    it('rejects non-object body', () => {
      const result = validateCheckoutRequest('string');
      expect(result.valid).toBe(false);
    });

    it('rejects missing product_id', () => {
      const body = {
        company_slug: 'google',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('product_id is required and must be a string');
      }
    });

    it('rejects missing company_slug', () => {
      const body = {
        product_id: 'price_123',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('company_slug is required and must be a string');
      }
    });

    it('rejects missing role_slug', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('role_slug is required and must be a string');
      }
    });

    it('rejects non-string product_id', () => {
      const body = {
        product_id: 123,
        company_slug: 'google',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
    });

    it('rejects uppercase company_slug', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'Google',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('company_slug must be lowercase with hyphens only');
      }
    });

    it('rejects uppercase role_slug', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google',
        role_slug: 'Software-Engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('role_slug must be lowercase with hyphens only');
      }
    });

    it('rejects slug with spaces', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google inc',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
    });

    it('rejects slug with underscores', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google_inc',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
    });

    it('rejects slug with special characters', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google!',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
    });

    it('rejects empty strings', () => {
      const body = {
        product_id: '',
        company_slug: 'google',
        role_slug: 'software-engineer',
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(false);
    });

    it('ignores non-string optional URLs', () => {
      const body = {
        product_id: 'price_123',
        company_slug: 'google',
        role_slug: 'software-engineer',
        success_url: 123,
        cancel_url: null,
      };
      const result = validateCheckoutRequest(body);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.request.success_url).toBeUndefined();
        expect(result.request.cancel_url).toBeUndefined();
      }
    });
  });
});

describe('Stripe client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('isStripeConfigured returns false without env vars', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const { isStripeConfigured } = await import('../client');
    expect(isStripeConfigured()).toBe(false);
  });

  it('isStripeConfigured returns true with env vars', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
    const { isStripeConfigured } = await import('../client');
    expect(isStripeConfigured()).toBe(true);
  });

  it('getStripePublicKey throws without env var', async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const { getStripePublicKey } = await import('../client');
    expect(() => getStripePublicKey()).toThrow('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set');
  });

  it('getStripePublicKey returns key with env var', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_abc123';
    const { getStripePublicKey } = await import('../client');
    expect(getStripePublicKey()).toBe('pk_test_abc123');
  });
});
