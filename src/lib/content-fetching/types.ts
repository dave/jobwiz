/**
 * Content fetching types for landing pages
 *
 * Note: Module content is now loaded from JSON files by the carousel loader.
 * See src/lib/carousel/load-modules.ts for module types.
 */

/** Result of an access check */
export interface AccessCheckResult {
  hasAccess: boolean;
  userId?: string;
  purchaseId?: string;
  expiresAt?: string;
}

/** Cached content with metadata */
export interface CachedContent<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  cacheKey: string;
}
