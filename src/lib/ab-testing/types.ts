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

// =====================================================
// Issue #42: Experiment and Variant Storage Types
// =====================================================

/**
 * Experiment status
 * - draft: not active, no assignments allowed
 * - running: active, assigns variants
 * - concluded: no new assignments, keep existing
 */
export type ExperimentStatus = "draft" | "running" | "concluded";

/**
 * Traffic split configuration - maps variant names to percentages
 */
export type TrafficSplit = Record<VariantName, number>;

/**
 * Experiment configuration stored in Supabase
 */
export interface Experiment {
  /** Unique identifier */
  id: string;
  /** Experiment name (unique key for lookups) */
  name: ExperimentName;
  /** Description of the experiment */
  description: string | null;
  /** Array of variant names */
  variants: VariantName[];
  /** Traffic allocation percentages */
  trafficSplit: TrafficSplit;
  /** Current status */
  status: ExperimentStatus;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Database row for experiment (snake_case)
 */
export interface ExperimentRow {
  id: string;
  name: string;
  description: string | null;
  variants: string[];
  traffic_split: Record<string, number>;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Source of variant assignment
 */
export type AssignmentSource = "calculated" | "forced" | "localStorage";

/**
 * Variant assignment stored in Supabase
 */
export interface VariantAssignmentRecord {
  /** Unique identifier */
  id: string;
  /** User ID (anonymous or auth) */
  userId: UserId;
  /** Experiment ID (foreign key) */
  experimentId: string;
  /** Experiment name (denormalized) */
  experimentName: ExperimentName;
  /** Assigned variant */
  variant: VariantName;
  /** Bucket number used for assignment (-1 for forced) */
  bucket: BucketNumber;
  /** How the assignment was made */
  source: AssignmentSource;
  /** Assignment timestamp */
  assignedAt: string;
}

/**
 * Database row for variant assignment (snake_case)
 */
export interface VariantAssignmentRow {
  id: string;
  user_id: string;
  experiment_id: string;
  experiment_name: string;
  variant: string;
  bucket: number;
  source: string;
  assigned_at: string;
}

/**
 * Input for creating a new experiment
 */
export interface CreateExperimentInput {
  name: ExperimentName;
  description?: string;
  variants: VariantName[];
  trafficSplit: TrafficSplit;
  status?: ExperimentStatus;
}

/**
 * Input for creating a variant assignment
 */
export interface CreateVariantAssignmentInput {
  userId: UserId;
  experimentId: string;
  experimentName: ExperimentName;
  variant: VariantName;
  bucket: BucketNumber;
  source?: AssignmentSource;
}

/**
 * Result of getting variant for user
 */
export interface GetVariantResult {
  /** Assigned variant (null if experiment not running or no assignment for concluded) */
  variant: VariantName | null;
  /** Full assignment record (null if no assignment) */
  assignment: VariantAssignmentRecord | null;
  /** Experiment configuration */
  experiment: Experiment | null;
  /** Whether this is a new assignment */
  isNew: boolean;
  /** Error if any occurred */
  error?: string;
}
