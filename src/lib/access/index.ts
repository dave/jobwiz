/**
 * Access management exports
 * Issue: #40 - Purchase unlock flow
 */

export type {
  AccessGrant,
  AccessSource,
  AccessCheckResult,
  GrantAccessInput,
  GrantBundleAccessInput,
  GuestPurchase,
  CreateGuestPurchaseInput,
} from './types';

export {
  // Core access functions
  grantAccess,
  hasAccess,
  checkAccess,
  revokeAccess,
  getAccessGrant,
  getUserAccessGrants,
  // Bundle access functions
  grantBundleAccess,
  revokeBundleAccess,
  // Guest purchase functions
  createGuestPurchase,
  getGuestPurchasesByEmail,
  linkGuestPurchases,
  hasPendingGuestPurchases,
} from './storage';
