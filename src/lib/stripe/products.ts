/**
 * Product configuration for Stripe integration
 * Issue: #39 - Flexible pricing structure
 *
 * This file defines the pricing structure and product configuration
 * for the JobWiz interview prep platform.
 */

import type { AccessType, ProductConfig, ProductMetadata } from './types';

/**
 * Default pricing for single company/role access (in cents)
 */
export const DEFAULT_SINGLE_PRICE = 19900; // $199.00

/**
 * Test mode pricing (lower prices for testing)
 */
export const TEST_SINGLE_PRICE = 500; // $5.00

/**
 * Bundle pricing multipliers
 */
export const BUNDLE_DISCOUNTS = {
  company_bundle: 0.7, // 30% discount for all roles at a company
  role_bundle: 0.6, // 40% discount for same role at all companies
  full: 0.5, // 50% discount for full access
} as const;

/**
 * Stripe product IDs for different access types
 * These should be configured in the Stripe Dashboard
 *
 * In development/test mode, we use price_data instead of these IDs
 */
export const STRIPE_PRODUCTS = {
  single: {
    product_id: process.env.STRIPE_SINGLE_PRODUCT_ID || 'prod_single_access',
    price_id: process.env.STRIPE_SINGLE_PRICE_ID || 'price_single_access',
  },
  company_bundle: {
    product_id: process.env.STRIPE_COMPANY_BUNDLE_PRODUCT_ID || 'prod_company_bundle',
    price_id: process.env.STRIPE_COMPANY_BUNDLE_PRICE_ID || 'price_company_bundle',
  },
  role_bundle: {
    product_id: process.env.STRIPE_ROLE_BUNDLE_PRODUCT_ID || 'prod_role_bundle',
    price_id: process.env.STRIPE_ROLE_BUNDLE_PRICE_ID || 'price_role_bundle',
  },
  full: {
    product_id: process.env.STRIPE_FULL_PRODUCT_ID || 'prod_full_access',
    price_id: process.env.STRIPE_FULL_PRICE_ID || 'price_full_access',
  },
} as const;

/**
 * Check if we're in test mode
 */
export function isTestMode(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.STRIPE_TEST_MODE === 'true' ||
    (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false)
  );
}

/**
 * Get the base price for a single company/role access
 */
export function getSinglePrice(): number {
  if (isTestMode()) {
    return TEST_SINGLE_PRICE;
  }
  // Allow override via environment variable for AB testing
  const envPrice = process.env.STRIPE_SINGLE_PRICE;
  if (envPrice) {
    const parsed = parseInt(envPrice, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_SINGLE_PRICE;
}

/**
 * Calculate bundle price based on access type and number of items
 *
 * @param accessType - The type of bundle access
 * @param basePrice - The base price for a single item
 * @param itemCount - Number of items in the bundle (roles for company bundle, companies for role bundle)
 */
export function calculateBundlePrice(
  accessType: AccessType,
  basePrice: number,
  itemCount: number
): number {
  if (accessType === 'single' || itemCount <= 1) {
    return basePrice;
  }

  const discount = BUNDLE_DISCOUNTS[accessType] ?? 1;
  // Bundle price = single price * item count * discount factor
  return Math.round(basePrice * itemCount * discount);
}

/**
 * Get product configuration for a specific company/role combination
 *
 * @param companySlug - Company slug (e.g., 'google')
 * @param roleSlug - Role slug (e.g., 'software-engineer')
 */
export function getProductForPosition(
  companySlug: string,
  roleSlug: string
): ProductConfig {
  const singlePrice = getSinglePrice();

  return {
    id: STRIPE_PRODUCTS.single.product_id,
    price_id: STRIPE_PRODUCTS.single.price_id,
    name: `${formatCompanyName(companySlug)} ${formatRoleName(roleSlug)} Interview Prep`,
    description: 'Full access to company and role-specific interview preparation content',
    amount: singlePrice,
    currency: 'usd',
    access_type: 'single',
    company_slug: companySlug,
    role_slug: roleSlug,
  };
}

/**
 * Get product configuration for a company bundle (all roles at a company)
 *
 * @param companySlug - Company slug
 * @param roleCount - Number of roles available for this company
 */
export function getCompanyBundleProduct(
  companySlug: string,
  roleCount: number
): ProductConfig {
  const singlePrice = getSinglePrice();
  const bundlePrice = calculateBundlePrice('company_bundle', singlePrice, roleCount);

  return {
    id: STRIPE_PRODUCTS.company_bundle.product_id,
    price_id: STRIPE_PRODUCTS.company_bundle.price_id,
    name: `${formatCompanyName(companySlug)} Interview Prep - All Roles`,
    description: `Full access to all ${roleCount} role-specific interview preparation courses for ${formatCompanyName(companySlug)}`,
    amount: bundlePrice,
    currency: 'usd',
    access_type: 'company_bundle',
    company_slug: companySlug,
    role_slug: null,
  };
}

/**
 * Get product configuration for a role bundle (same role at all companies)
 *
 * @param roleSlug - Role slug
 * @param companyCount - Number of companies available for this role
 */
export function getRoleBundleProduct(
  roleSlug: string,
  companyCount: number
): ProductConfig {
  const singlePrice = getSinglePrice();
  const bundlePrice = calculateBundlePrice('role_bundle', singlePrice, companyCount);

  return {
    id: STRIPE_PRODUCTS.role_bundle.product_id,
    price_id: STRIPE_PRODUCTS.role_bundle.price_id,
    name: `${formatRoleName(roleSlug)} Interview Prep - All Companies`,
    description: `Full access to ${formatRoleName(roleSlug)} interview preparation for all ${companyCount} companies`,
    amount: bundlePrice,
    currency: 'usd',
    access_type: 'role_bundle',
    company_slug: null,
    role_slug: roleSlug,
  };
}

/**
 * Get product configuration for full access (all companies and roles)
 *
 * @param totalPositions - Total number of company/role combinations
 */
export function getFullAccessProduct(totalPositions: number): ProductConfig {
  const singlePrice = getSinglePrice();
  const bundlePrice = calculateBundlePrice('full', singlePrice, totalPositions);

  return {
    id: STRIPE_PRODUCTS.full.product_id,
    price_id: STRIPE_PRODUCTS.full.price_id,
    name: 'Ace That Interview - Full Access',
    description: `Complete access to all ${totalPositions} interview preparation courses`,
    amount: bundlePrice,
    currency: 'usd',
    access_type: 'full',
    company_slug: null,
    role_slug: null,
  };
}

/**
 * Get price by company and role slugs
 * This is the main function for looking up prices
 */
export function getPriceByPosition(
  companySlug: string,
  roleSlug: string
): number {
  const product = getProductForPosition(companySlug, roleSlug);
  return product.amount;
}

/**
 * Get price formatted as a string (e.g., "$200.00")
 */
export function formatPrice(amountInCents: number, currency = 'usd'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(amountInCents / 100);
}

/**
 * Parse product metadata from Stripe to determine access scope
 *
 * @param metadata - Product metadata from Stripe
 * @returns Parsed access scope
 */
export function parseAccessScope(metadata: ProductMetadata): {
  grantAll: boolean;
  companies: string[];
  roles: string[];
} {
  switch (metadata.access_type) {
    case 'full':
      return { grantAll: true, companies: [], roles: [] };
    case 'company_bundle':
      return {
        grantAll: false,
        companies: metadata.company_slug ? [metadata.company_slug] : [],
        roles: [], // All roles for the company
      };
    case 'role_bundle':
      return {
        grantAll: false,
        companies: [], // All companies
        roles: metadata.role_slug ? [metadata.role_slug] : [],
      };
    case 'single':
    default:
      return {
        grantAll: false,
        companies: metadata.company_slug ? [metadata.company_slug] : [],
        roles: metadata.role_slug ? [metadata.role_slug] : [],
      };
  }
}

/**
 * Build product metadata for Stripe session
 */
export function buildProductMetadata(
  accessType: AccessType,
  companySlug: string | null,
  roleSlug: string | null
): Record<string, string> {
  const metadata: Record<string, string> = {
    access_type: accessType,
  };

  if (companySlug) {
    metadata.company_slug = companySlug;
  }

  if (roleSlug) {
    metadata.role_slug = roleSlug;
  }

  return metadata;
}

/**
 * Format company slug to display name
 */
function formatCompanyName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format role slug to display name
 */
function formatRoleName(slug: string): string {
  const roleNames: Record<string, string> = {
    'software-engineer': 'Software Engineer',
    'product-manager': 'Product Manager',
    'data-scientist': 'Data Scientist',
    'swe': 'Software Engineer',
    'pm': 'Product Manager',
    'ds': 'Data Scientist',
  };

  return roleNames[slug] || slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all available products for a company
 * Returns both single products for each role and the company bundle
 */
export function getProductsForCompany(
  companySlug: string,
  roles: Array<{ slug: string; name: string }>
): ProductConfig[] {
  const products: ProductConfig[] = [];

  // Add single products for each role
  for (const role of roles) {
    products.push(getProductForPosition(companySlug, role.slug));
  }

  // Add company bundle if there are multiple roles
  if (roles.length > 1) {
    products.push(getCompanyBundleProduct(companySlug, roles.length));
  }

  return products;
}
