/**
 * Tests for Stripe types and utilities
 */
import {
  DEFAULT_PRODUCT,
  isValidProductMetadata,
  parseProductMetadata,
  type AccessType,
  type ProductMetadata,
} from '../types';

describe('Stripe types', () => {
  describe('DEFAULT_PRODUCT', () => {
    it('has the correct structure', () => {
      expect(DEFAULT_PRODUCT).toEqual({
        id: 'prod_single_access',
        price_id: 'price_single_access',
        name: 'Interview Prep Course',
        description: 'Full access to company and role-specific interview preparation content',
        amount: 20000,
        currency: 'usd',
        access_type: 'single',
      });
    });

    it('has amount in cents ($200)', () => {
      expect(DEFAULT_PRODUCT.amount).toBe(20000);
    });
  });

  describe('isValidProductMetadata', () => {
    it('returns true for valid single access type', () => {
      const metadata = { access_type: 'single' };
      expect(isValidProductMetadata(metadata)).toBe(true);
    });

    it('returns true for valid company_bundle access type', () => {
      const metadata = { access_type: 'company_bundle' };
      expect(isValidProductMetadata(metadata)).toBe(true);
    });

    it('returns true for valid role_bundle access type', () => {
      const metadata = { access_type: 'role_bundle' };
      expect(isValidProductMetadata(metadata)).toBe(true);
    });

    it('returns true for valid full access type', () => {
      const metadata = { access_type: 'full' };
      expect(isValidProductMetadata(metadata)).toBe(true);
    });

    it('returns false for invalid access type', () => {
      const metadata = { access_type: 'invalid' };
      expect(isValidProductMetadata(metadata)).toBe(false);
    });

    it('returns false for missing access type', () => {
      const metadata = { other: 'value' };
      expect(isValidProductMetadata(metadata)).toBe(false);
    });

    it('returns false for empty object', () => {
      const metadata = {};
      expect(isValidProductMetadata(metadata)).toBe(false);
    });
  });

  describe('parseProductMetadata', () => {
    it('parses valid metadata correctly', () => {
      const metadata = {
        access_type: 'single',
        company_slug: 'google',
        role_slug: 'software-engineer',
      };
      const result = parseProductMetadata(metadata);
      expect(result).toEqual({
        access_type: 'single',
        company_slug: 'google',
        role_slug: 'software-engineer',
      });
    });

    it('handles null metadata', () => {
      const result = parseProductMetadata(null);
      expect(result).toEqual({
        access_type: 'single',
        company_slug: null,
        role_slug: null,
      });
    });

    it('handles missing slugs', () => {
      const metadata = { access_type: 'full' };
      const result = parseProductMetadata(metadata);
      expect(result).toEqual({
        access_type: 'full',
        company_slug: null,
        role_slug: null,
      });
    });

    it('handles empty string slugs as null', () => {
      const metadata = {
        access_type: 'single',
        company_slug: '',
        role_slug: '',
      };
      const result = parseProductMetadata(metadata);
      expect(result).toEqual({
        access_type: 'single',
        company_slug: null,
        role_slug: null,
      });
    });

    it('returns default for invalid access type', () => {
      const metadata = { access_type: 'invalid' };
      const result = parseProductMetadata(metadata);
      expect(result).toEqual({
        access_type: 'single',
        company_slug: null,
        role_slug: null,
      });
    });
  });

  describe('type definitions', () => {
    it('AccessType accepts valid values', () => {
      const types: AccessType[] = ['single', 'company_bundle', 'role_bundle', 'full'];
      expect(types).toHaveLength(4);
    });

    it('ProductMetadata has correct shape', () => {
      const metadata: ProductMetadata = {
        access_type: 'single',
        company_slug: 'google',
        role_slug: 'software-engineer',
      };
      expect(metadata.access_type).toBe('single');
      expect(metadata.company_slug).toBe('google');
      expect(metadata.role_slug).toBe('software-engineer');
    });

    it('ProductMetadata allows null slugs', () => {
      const metadata: ProductMetadata = {
        access_type: 'full',
        company_slug: null,
        role_slug: null,
      };
      expect(metadata.company_slug).toBeNull();
      expect(metadata.role_slug).toBeNull();
    });
  });
});
