/**
 * Types for generation priority queue system
 * Issue #32 - Generation priority queue system
 */

/**
 * Queue item status
 */
export type QueueStatus = "pending" | "in_progress" | "completed" | "failed";

/**
 * Database row for generation_queue table
 */
export interface DbQueueItem {
  id: string;
  company_slug: string;
  role_slug: string | null;
  priority_score: number;
  status: QueueStatus;
  claimed_at: string | null;
  claimed_by: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  module_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for adding item to queue
 */
export interface AddQueueItemInput {
  company_slug: string;
  role_slug?: string | null;
  priority_score?: number;
}

/**
 * Queue status summary
 */
export interface QueueStatusSummary {
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  total: number;
}

/**
 * Company data from search_volume.json
 */
export interface SearchVolumeCompany {
  name: string;
  slug: string;
  category: string;
  interview_volume: number;
  roles: Array<{
    name: string;
    slug: string;
    volume: number;
  }>;
}

/**
 * Priority entry from search_volume.json
 */
export interface PriorityEntry {
  company: string;
  role: string | null;
  score: number;
}

/**
 * Full search volume data
 */
export interface SearchVolumeData {
  generated_at: string;
  geography: string;
  status: string;
  companies: SearchVolumeCompany[];
  priority_list: PriorityEntry[];
}
