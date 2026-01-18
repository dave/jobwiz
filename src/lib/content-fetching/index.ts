/**
 * Content fetching layer for landing pages
 * Provides server-side data fetching with Supabase and caching
 */

// Types
export type {
  PositionContent,
  PreviewContent,
  FullContent,
  TruncatedSection,
  AccessCheckResult,
  ContentFetchOptions,
  CachedContent,
  ModuleWithBlocks,
  ModuleSectionWithBlocks,
  TransformedBlock,
} from "./types";

// Query functions
export {
  getCompanyBySlug,
  getRoleBySlug,
  getModulesForPosition,
  getPreviewContent,
  getFullContent,
  checkUserAccess,
} from "./queries";

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
