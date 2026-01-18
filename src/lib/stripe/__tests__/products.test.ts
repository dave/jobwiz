/**
 * Tests for Stripe product configuration
 * Issue: #39 - Flexible pricing structure
 */

import {
  DEFAULT_SINGLE_PRICE,
  TEST_SINGLE_PRICE,
  BUNDLE_DISCOUNTS,
  STRIPE_PRODUCTS,
  isTestMode,
  getSinglePrice,
  calculateBundlePrice,
  getProductForPosition,
  getCompanyBundleProduct,
  getRoleBundleProduct,
  getFullAccessProduct,
  getPriceByPosition,
  formatPrice,
  parseAccessScope,
  buildProductMetadata,
  getProductsForCompany,
} from '../products';
import type { AccessType, ProductMetadata } from '../types';

describe('Price constants', () => {
  test('DEFAULT_SINGLE_PRICE is $200 in cents', () => {
    expect(DEFAULT_SINGLE_PRICE).toBe(20000);
  });

  test('TEST_SINGLE_PRICE is $5 in cents', () => {
    expect(TEST_SINGLE_PRICE).toBe(500);
  });

  test('BUNDLE_DISCOUNTS are defined', () => {
    expect(BUNDLE_DISCOUNTS.company_bundle).toBe(0.7);
    expect(BUNDLE_DISCOUNTS.role_bundle).toBe(0.6);
    expect(BUNDLE_DISCOUNTS.full).toBe(0.5);
  });

  test('STRIPE_PRODUCTS has all access types', () => {
    expect(STRIPE_PRODUCTS.single).toBeDefined();
    expect(STRIPE_PRODUCTS.company_bundle).toBeDefined();
    expect(STRIPE_PRODUCTS.role_bundle).toBeDefined();
    expect(STRIPE_PRODUCTS.full).toBeDefined();
  });
});

describe('isTestMode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns true in test environment', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    expect(isTestMode()).toBe(true);
  });

  test('returns true when STRIPE_TEST_MODE is true', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.STRIPE_TEST_MODE = 'true';
    expect(isTestMode()).toBe(true);
  });

  test('returns true when STRIPE_SECRET_KEY starts with sk_test_', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.STRIPE_TEST_MODE;
    process.env.STRIPE_SECRET_KEY = 'sk_test_12345';
    expect(isTestMode()).toBe(true);
  });

  test('returns false in production with live key', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.STRIPE_TEST_MODE;
    process.env.STRIPE_SECRET_KEY = 'sk_live_12345';
    expect(isTestMode()).toBe(false);
  });
});

describe('getSinglePrice', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns TEST_SINGLE_PRICE in test mode', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    expect(getSinglePrice()).toBe(TEST_SINGLE_PRICE);
  });

  test('returns custom price from env variable', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_live_12345';
    process.env.STRIPE_SINGLE_PRICE = '15000';
    expect(getSinglePrice()).toBe(15000);
  });

  test('ignores invalid env price', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_live_12345';
    process.env.STRIPE_SINGLE_PRICE = 'invalid';
    expect(getSinglePrice()).toBe(DEFAULT_SINGLE_PRICE);
  });

  test('ignores zero or negative env price', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_live_12345';
    process.env.STRIPE_SINGLE_PRICE = '0';
    expect(getSinglePrice()).toBe(DEFAULT_SINGLE_PRICE);
  });
});

describe('calculateBundlePrice', () => {
  const basePrice = 20000; // $200

  test('returns base price for single access type', () => {
    expect(calculateBundlePrice('single', basePrice, 5)).toBe(basePrice);
  });

  test('returns base price for item count of 1', () => {
    expect(calculateBundlePrice('company_bundle', basePrice, 1)).toBe(basePrice);
  });

  test('calculates company bundle price with 30% discount', () => {
    // 2 roles: $200 * 2 * 0.7 = $280
    expect(calculateBundlePrice('company_bundle', basePrice, 2)).toBe(28000);
  });

  test('calculates role bundle price with 40% discount', () => {
    // 3 companies: $200 * 3 * 0.6 = $360
    expect(calculateBundlePrice('role_bundle', basePrice, 3)).toBe(36000);
  });

  test('calculates full access price with 50% discount', () => {
    // 6 positions: $200 * 6 * 0.5 = $600
    expect(calculateBundlePrice('full', basePrice, 6)).toBe(60000);
  });

  test('rounds to nearest cent', () => {
    // Odd calculation that might produce decimals
    const result = calculateBundlePrice('company_bundle', 10001, 3);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('getProductForPosition', () => {
  test('returns correct product config for google/software-engineer', () => {
    const product = getProductForPosition('google', 'software-engineer');

    expect(product.name).toBe('Google Software Engineer Interview Prep');
    expect(product.access_type).toBe('single');
    expect(product.company_slug).toBe('google');
    expect(product.role_slug).toBe('software-engineer');
    expect(product.currency).toBe('usd');
    expect(typeof product.amount).toBe('number');
    expect(product.amount).toBeGreaterThan(0);
  });

  test('formats multi-word company slugs correctly', () => {
    const product = getProductForPosition('jp-morgan', 'data-scientist');
    expect(product.name).toBe('Jp Morgan Data Scientist Interview Prep');
  });

  test('handles role slug mapping', () => {
    const productSwe = getProductForPosition('apple', 'swe');
    expect(productSwe.name).toContain('Software Engineer');

    const productPm = getProductForPosition('apple', 'pm');
    expect(productPm.name).toContain('Product Manager');
  });

  test('includes product ID and price ID', () => {
    const product = getProductForPosition('microsoft', 'product-manager');
    expect(product.id).toBeDefined();
    expect(product.price_id).toBeDefined();
  });
});

describe('getCompanyBundleProduct', () => {
  test('returns correct bundle config', () => {
    const product = getCompanyBundleProduct('google', 3);

    expect(product.name).toBe('Google Interview Prep - All Roles');
    expect(product.access_type).toBe('company_bundle');
    expect(product.company_slug).toBe('google');
    expect(product.role_slug).toBeNull();
    expect(product.description).toContain('3 role-specific');
  });

  test('applies bundle discount to price', () => {
    const singleProduct = getProductForPosition('google', 'software-engineer');
    const bundleProduct = getCompanyBundleProduct('google', 2);

    // Bundle price should be less than 2x single price due to discount
    expect(bundleProduct.amount).toBeLessThan(singleProduct.amount * 2);
    expect(bundleProduct.amount).toBeGreaterThan(singleProduct.amount);
  });
});

describe('getRoleBundleProduct', () => {
  test('returns correct bundle config', () => {
    const product = getRoleBundleProduct('software-engineer', 5);

    expect(product.name).toBe('Software Engineer Interview Prep - All Companies');
    expect(product.access_type).toBe('role_bundle');
    expect(product.company_slug).toBeNull();
    expect(product.role_slug).toBe('software-engineer');
    expect(product.description).toContain('5 companies');
  });

  test('applies bundle discount to price', () => {
    const singleProduct = getProductForPosition('google', 'software-engineer');
    const bundleProduct = getRoleBundleProduct('software-engineer', 3);

    // Bundle price should be less than 3x single price due to discount
    expect(bundleProduct.amount).toBeLessThan(singleProduct.amount * 3);
    expect(bundleProduct.amount).toBeGreaterThan(singleProduct.amount);
  });
});

describe('getFullAccessProduct', () => {
  test('returns correct config', () => {
    const product = getFullAccessProduct(10);

    expect(product.name).toBe('JobWiz Interview Prep - Full Access');
    expect(product.access_type).toBe('full');
    expect(product.company_slug).toBeNull();
    expect(product.role_slug).toBeNull();
    expect(product.description).toContain('10 interview preparation courses');
  });

  test('applies 50% discount to price', () => {
    const singlePrice = getSinglePrice();
    const fullProduct = getFullAccessProduct(6);

    // Full access: 6 * single * 0.5 = 3 * single
    expect(fullProduct.amount).toBe(singlePrice * 6 * 0.5);
  });
});

describe('getPriceByPosition', () => {
  test('returns price for company/role', () => {
    const price = getPriceByPosition('google', 'software-engineer');
    expect(typeof price).toBe('number');
    expect(price).toBeGreaterThan(0);
  });

  test('returns same price as getProductForPosition', () => {
    const product = getProductForPosition('apple', 'product-manager');
    const price = getPriceByPosition('apple', 'product-manager');
    expect(price).toBe(product.amount);
  });
});

describe('formatPrice', () => {
  test('formats USD price correctly', () => {
    expect(formatPrice(20000)).toBe('$200.00');
  });

  test('formats cents correctly', () => {
    expect(formatPrice(999)).toBe('$9.99');
  });

  test('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  test('handles large amounts', () => {
    expect(formatPrice(100000)).toBe('$1,000.00');
  });

  test('respects currency parameter', () => {
    const result = formatPrice(20000, 'eur');
    expect(result).toContain('€');
  });
});

describe('parseAccessScope', () => {
  test('parses single access', () => {
    const metadata: ProductMetadata = {
      access_type: 'single',
      company_slug: 'google',
      role_slug: 'software-engineer',
    };

    const scope = parseAccessScope(metadata);

    expect(scope.grantAll).toBe(false);
    expect(scope.companies).toEqual(['google']);
    expect(scope.roles).toEqual(['software-engineer']);
  });

  test('parses company bundle access', () => {
    const metadata: ProductMetadata = {
      access_type: 'company_bundle',
      company_slug: 'apple',
      role_slug: null,
    };

    const scope = parseAccessScope(metadata);

    expect(scope.grantAll).toBe(false);
    expect(scope.companies).toEqual(['apple']);
    expect(scope.roles).toEqual([]); // All roles
  });

  test('parses role bundle access', () => {
    const metadata: ProductMetadata = {
      access_type: 'role_bundle',
      company_slug: null,
      role_slug: 'product-manager',
    };

    const scope = parseAccessScope(metadata);

    expect(scope.grantAll).toBe(false);
    expect(scope.companies).toEqual([]); // All companies
    expect(scope.roles).toEqual(['product-manager']);
  });

  test('parses full access', () => {
    const metadata: ProductMetadata = {
      access_type: 'full',
      company_slug: null,
      role_slug: null,
    };

    const scope = parseAccessScope(metadata);

    expect(scope.grantAll).toBe(true);
    expect(scope.companies).toEqual([]);
    expect(scope.roles).toEqual([]);
  });

  test('handles missing slugs in single access', () => {
    const metadata: ProductMetadata = {
      access_type: 'single',
      company_slug: null,
      role_slug: null,
    };

    const scope = parseAccessScope(metadata);

    expect(scope.grantAll).toBe(false);
    expect(scope.companies).toEqual([]);
    expect(scope.roles).toEqual([]);
  });
});

describe('buildProductMetadata', () => {
  test('builds metadata for single access', () => {
    const metadata = buildProductMetadata('single', 'google', 'software-engineer');

    expect(metadata.access_type).toBe('single');
    expect(metadata.company_slug).toBe('google');
    expect(metadata.role_slug).toBe('software-engineer');
  });

  test('builds metadata for company bundle', () => {
    const metadata = buildProductMetadata('company_bundle', 'apple', null);

    expect(metadata.access_type).toBe('company_bundle');
    expect(metadata.company_slug).toBe('apple');
    expect(metadata.role_slug).toBeUndefined();
  });

  test('builds metadata for role bundle', () => {
    const metadata = buildProductMetadata('role_bundle', null, 'data-scientist');

    expect(metadata.access_type).toBe('role_bundle');
    expect(metadata.company_slug).toBeUndefined();
    expect(metadata.role_slug).toBe('data-scientist');
  });

  test('builds metadata for full access', () => {
    const metadata = buildProductMetadata('full', null, null);

    expect(metadata.access_type).toBe('full');
    expect(metadata.company_slug).toBeUndefined();
    expect(metadata.role_slug).toBeUndefined();
  });

  test('returns plain object suitable for Stripe', () => {
    const metadata = buildProductMetadata('single', 'google', 'pm');

    // All values should be strings (Stripe requirement)
    for (const value of Object.values(metadata)) {
      expect(typeof value).toBe('string');
    }
  });
});

describe('getProductsForCompany', () => {
  const roles = [
    { slug: 'software-engineer', name: 'Software Engineer' },
    { slug: 'product-manager', name: 'Product Manager' },
    { slug: 'data-scientist', name: 'Data Scientist' },
  ];

  test('returns single products for each role', () => {
    const products = getProductsForCompany('google', roles);

    // Should have 3 single products + 1 bundle
    expect(products.length).toBe(4);

    const singleProducts = products.filter(p => p.access_type === 'single');
    expect(singleProducts.length).toBe(3);

    // Check each role is covered
    expect(singleProducts.some(p => p.role_slug === 'software-engineer')).toBe(true);
    expect(singleProducts.some(p => p.role_slug === 'product-manager')).toBe(true);
    expect(singleProducts.some(p => p.role_slug === 'data-scientist')).toBe(true);
  });

  test('includes company bundle when multiple roles', () => {
    const products = getProductsForCompany('google', roles);

    const bundles = products.filter(p => p.access_type === 'company_bundle');
    expect(bundles.length).toBe(1);
    expect(bundles[0]?.company_slug).toBe('google');
  });

  test('does not include bundle for single role', () => {
    const singleRole = [{ slug: 'software-engineer', name: 'Software Engineer' }];
    const products = getProductsForCompany('google', singleRole);

    expect(products.length).toBe(1);
    expect(products[0]?.access_type).toBe('single');
  });

  test('all products have correct company_slug', () => {
    const products = getProductsForCompany('apple', roles);

    for (const product of products) {
      if (product.access_type === 'single' || product.access_type === 'company_bundle') {
        expect(product.company_slug).toBe('apple');
      }
    }
  });
});

describe('Pricing integration', () => {
  test('bundle always cheaper than buying singles separately', () => {
    const singlePrice = getSinglePrice();
    const roleCount = 3;

    const totalSingles = singlePrice * roleCount;
    const bundleProduct = getCompanyBundleProduct('google', roleCount);

    expect(bundleProduct.amount).toBeLessThan(totalSingles);
  });

  test('full access is cheapest per-position', () => {
    const singlePrice = getSinglePrice();
    const positionCount = 6;

    const fullProduct = getFullAccessProduct(positionCount);
    const pricePerPosition = fullProduct.amount / positionCount;

    expect(pricePerPosition).toBe(singlePrice * 0.5);
  });

  test('all prices are positive integers', () => {
    const products = [
      getProductForPosition('google', 'software-engineer'),
      getCompanyBundleProduct('google', 3),
      getRoleBundleProduct('software-engineer', 3),
      getFullAccessProduct(9),
    ];

    for (const product of products) {
      expect(product.amount).toBeGreaterThan(0);
      expect(Number.isInteger(product.amount)).toBe(true);
    }
  });
});
