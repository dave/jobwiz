/**
 * AB Testing Module
 * Issue: #41 - User bucketing system
 * Issue: #42 - Variant assignment + storage
 *
 * Provides user bucketing for AB tests with:
 * - Deterministic bucketing using MD5 hash
 * - Anonymous user ID via cookies
 * - Logged in user ID from Supabase
 * - Sticky bucketing via localStorage
 * - Supabase persistence for experiments and assignments
 */

// Types
export type {
  UserId,
  BucketNumber,
  ExperimentName,
  VariantName,
  BucketingConfig,
  BucketResult,
  VariantAssignment,
  StoredVariant,
  UserIdSource,
  UserIdResult,
  // #42 Types
  ExperimentStatus,
  TrafficSplit,
  Experiment,
  ExperimentRow,
  AssignmentSource,
  VariantAssignmentRecord,
  VariantAssignmentRow,
  CreateExperimentInput,
  CreateVariantAssignmentInput,
  GetVariantResult,
} from "./types";

export {
  USER_ID_COOKIE_NAME,
  USER_ID_COOKIE_EXPIRY_MS,
  USER_ID_COOKIE_EXPIRY_SECONDS,
  VARIANT_STORAGE_PREFIX,
} from "./types";

// Bucketing
export {
  getBucket,
  getBucketResult,
  testBucketDistribution,
  isDistributionUniform,
} from "./bucketing";

// User ID
export {
  generateUUID,
  isValidUUID,
  getUserId,
  getOrCreateAnonymousId,
  getUserIdFromCookie,
  saveUserIdToCookie,
  parseCookies,
  getCookie,
  setCookie,
  getUserIdCookieOptions,
  formatCookieHeader,
  getUserIdFromRequest,
} from "./user-id";

// Sticky Bucketing
export {
  getStorageKey,
  isLocalStorageAvailable,
  getStoredVariant,
  storeVariant,
  clearStoredVariant,
  clearAllStoredVariants,
  defaultVariantAssigner,
  createVariantAssigner,
  getOrAssignVariant,
  getVariantIfAssigned,
  forceAssignVariant,
} from "./sticky-bucketing";

export type { VariantAssigner } from "./sticky-bucketing";

export type { CookieOptions } from "./user-id";

// #42: Experiments Storage
export {
  transformExperimentRow,
  validateTrafficSplit,
  validateVariantsMatchSplit,
  getExperiment,
  getExperimentById,
  getAllExperiments,
  getRunningExperiments,
  createExperiment,
  updateExperimentStatus,
  updateExperimentTrafficSplit,
  deleteExperiment,
  experimentExists,
} from "./experiments";

// #42: Variant Assignments Storage
export {
  transformAssignmentRow,
  getAssignment,
  getAssignmentByName,
  getUserAssignments,
  createAssignment,
  upsertAssignment,
  deleteAssignment,
  getVariantForUser,
  forceAssignVariant as forceAssignVariantDB,
  syncLocalAssignment,
  getExperimentStats,
} from "./assignments";

// #42: Unified Variant Provider
export {
  getUnifiedVariant,
  getVariantForAnonymous,
  syncAllVariantsToSupabase,
  getVariantWithSplit,
  preloadExperiment,
} from "./variant-provider";

export type {
  GetVariantOptions,
  UnifiedVariantResult,
} from "./variant-provider";
