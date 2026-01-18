/**
 * Stripe integration exports
 */
export {
  createStripeClient,
  getStripeClient,
  getStripePublicKey,
  isStripeConfigured,
} from './client';

export {
  createCheckoutSession,
  getCheckoutSession,
  validateCheckoutRequest,
} from './checkout';

export type {
  AccessType,
  CheckoutErrorResponse,
  CheckoutSessionData,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  ProductConfig,
  ProductMetadata,
} from './types';

export {
  DEFAULT_PRODUCT,
  isValidProductMetadata,
  parseProductMetadata,
} from './types';

export type {
  AccessGrantRecord,
  CreateAccessGrantInput,
  CreatePurchaseInput,
  PurchaseRecord,
  WebhookErrorResponse,
  WebhookEventResult,
  WebhookEventType,
} from './types';

export {
  createAccessGrant,
  createPurchase,
  extractSessionMetadata,
  getPurchaseBySessionId,
  getWebhookSecret,
  processCheckoutCompleted,
  processChargeRefunded,
  processWebhookEvent,
  purchaseExists,
  revokeAccessGrant,
  updatePurchaseStatus,
  verifyWebhookSignature,
} from './webhooks';
