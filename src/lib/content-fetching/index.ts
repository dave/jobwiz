/**
 * Content fetching layer for landing pages
 * Provides server-side data fetching with Supabase and caching
 *
 * Note: Module content is now loaded from JSON files by the carousel loader.
 * See src/lib/carousel/load-modules.ts for module loading.
 */

// Types
export type { AccessCheckResult, CachedContent } from "./types";

// Query functions
export { getCompanyBySlug, getRoleBySlug, checkUserAccess } from "./queries";

// Cache utilities
export {
  getCacheKey,
  getCached,
  setCached,
  invalidatePosition,
  invalidateAll,
  getCacheStats,
  withCache,
  REVALIDATE_INTERVAL,
} from "./cache";
