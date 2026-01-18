/**
 * AB Testing Types
 * Issue: #41 - User bucketing system
 *
 * Type definitions for AB testing infrastructure
 */

/**
 * User ID type - can be either anonymous UUID or Supabase user ID
 */
export type UserId = string;

/**
 * Bucket number (0-99) for experiment assignment
 */
export type BucketNumber = number;

/**
 * Experiment name identifier
 */
export type ExperimentName = string;

/**
 * Variant name for an experiment
 */
export type VariantName = string;

/**
 * Cookie name for storing anonymous user ID
 */
export const USER_ID_COOKIE_NAME = "jw_uid";

/**
 * Cookie expiry in milliseconds (1 year)
 */
export const USER_ID_COOKIE_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Cookie expiry in seconds (for server-side)
 */
export const USER_ID_COOKIE_EXPIRY_SECONDS = 365 * 24 * 60 * 60;

/**
 * LocalStorage key prefix for sticky bucketing
 */
export const VARIANT_STORAGE_PREFIX = "jw_ab_";

/**
 * Bucketing configuration
 */
export interface BucketingConfig {
  /** User ID (anonymous or logged in) */
  userId: UserId;
  /** Experiment name */
  experimentName: ExperimentName;
}

/**
 * Bucket result from hash calculation
 */
export interface BucketResult {
  /** User ID used for bucketing */
  userId: UserId;
  /** Experiment name */
  experimentName: ExperimentName;
  /** Bucket number (0-99) */
  bucket: BucketNumber;
}

/**
 * Variant assignment result
 */
export interface VariantAssignment {
  /** User ID */
  userId: UserId;
  /** Experiment name */
  experimentName: ExperimentName;
  /** Assigned variant */
  variant: VariantName;
  /** Bucket number used for assignment */
  bucket: BucketNumber;
  /** Whether this was a new assignment or retrieved from storage */
  isNew: boolean;
}

/**
 * Stored variant data (for sticky bucketing)
 */
export interface StoredVariant {
  /** Variant name */
  variant: VariantName;
  /** Bucket number */
  bucket: BucketNumber;
  /** Timestamp when assigned */
  assignedAt: string;
}

/**
 * User ID source
 */
export type UserIdSource = "cookie" | "auth" | "generated";

/**
 * User ID result
 */
export interface UserIdResult {
  /** The user ID */
  userId: UserId;
  /** Source of the user ID */
  source: UserIdSource;
}
