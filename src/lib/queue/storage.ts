/**
 * Queue storage functions for Supabase
 * Provides CRUD operations for generation queue
 * Issue #32 - Generation priority queue system
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DbQueueItem,
  AddQueueItemInput,
  QueueStatusSummary,
} from "./types";

/**
 * Add an item to the generation queue
 * Uses ON CONFLICT to skip if item already exists
 */
export async function addToQueue(
  supabase: SupabaseClient,
  input: AddQueueItemInput
): Promise<DbQueueItem | null> {
  const { data, error } = await supabase
    .from("generation_queue")
    .upsert(
      {
        company_slug: input.company_slug,
        role_slug: input.role_slug ?? null,
        priority_score: input.priority_score ?? 0,
        status: "pending",
      },
      {
        onConflict: "company_slug,role_slug",
        ignoreDuplicates: true,
      }
    )
    .select()
    .single();

  if (error) {
    // Duplicate insert returns empty, which causes PGRST116
    if (error.code === "PGRST116") {
      return null; // Already exists
    }
    throw new Error(`Failed to add to queue: ${error.message}`);
  }

  return data as DbQueueItem;
}

/**
 * Add multiple items to the queue in batch
 * Returns number of new items added (excludes duplicates)
 */
export async function addToQueueBatch(
  supabase: SupabaseClient,
  items: AddQueueItemInput[]
): Promise<{ added: number; skipped: number }> {
  if (items.length === 0) return { added: 0, skipped: 0 };

  const { data, error } = await supabase
    .from("generation_queue")
    .upsert(
      items.map((input) => ({
        company_slug: input.company_slug,
        role_slug: input.role_slug ?? null,
        priority_score: input.priority_score ?? 0,
        status: "pending",
      })),
      {
        onConflict: "company_slug,role_slug",
        ignoreDuplicates: true,
      }
    )
    .select();

  if (error) {
    throw new Error(`Failed to add batch to queue: ${error.message}`);
  }

  const added = data?.length ?? 0;
  return { added, skipped: items.length - added };
}

/**
 * Get the next item to process (highest priority pending)
 * Claims the item atomically by setting status to in_progress
 */
export async function claimNextItem(
  supabase: SupabaseClient,
  claimedBy: string
): Promise<DbQueueItem | null> {
  // First, get the highest priority pending item
  const { data: nextItem, error: fetchError } = await supabase
    .from("generation_queue")
    .select("*")
    .eq("status", "pending")
    .order("priority_score", { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return null; // No pending items
    }
    throw new Error(`Failed to fetch next item: ${fetchError.message}`);
  }

  // Claim it atomically with a conditional update
  const { data: claimed, error: claimError } = await supabase
    .from("generation_queue")
    .update({
      status: "in_progress",
      claimed_at: new Date().toISOString(),
      claimed_by: claimedBy,
    })
    .eq("id", nextItem.id)
    .eq("status", "pending") // Only if still pending
    .select()
    .single();

  if (claimError) {
    if (claimError.code === "PGRST116") {
      // Item was claimed by another process, try again
      return claimNextItem(supabase, claimedBy);
    }
    throw new Error(`Failed to claim item: ${claimError.message}`);
  }

  return claimed as DbQueueItem;
}

/**
 * Mark an item as completed
 */
export async function completeQueueItem(
  supabase: SupabaseClient,
  itemId: string,
  moduleId?: string
): Promise<DbQueueItem> {
  const { data, error } = await supabase
    .from("generation_queue")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      module_id: moduleId ?? null,
    })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete queue item: ${error.message}`);
  }

  return data as DbQueueItem;
}

/**
 * Mark an item as failed
 * Increments retry_count and may reset to pending for retry
 */
export async function failQueueItem(
  supabase: SupabaseClient,
  itemId: string,
  errorMessage: string
): Promise<DbQueueItem> {
  // First, get current retry count
  const { data: current, error: fetchError } = await supabase
    .from("generation_queue")
    .select("retry_count, max_retries")
    .eq("id", itemId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch queue item: ${fetchError.message}`);
  }

  const newRetryCount = (current.retry_count ?? 0) + 1;
  const shouldRetry = newRetryCount < (current.max_retries ?? 3);

  const { data, error } = await supabase
    .from("generation_queue")
    .update({
      status: shouldRetry ? "pending" : "failed",
      error_message: errorMessage,
      retry_count: newRetryCount,
      claimed_at: null,
      claimed_by: null,
    })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to fail queue item: ${error.message}`);
  }

  return data as DbQueueItem;
}

/**
 * Get queue status summary
 */
export async function getQueueStatus(
  supabase: SupabaseClient
): Promise<QueueStatusSummary> {
  const { data, error } = await supabase
    .from("generation_queue")
    .select("status");

  if (error) {
    throw new Error(`Failed to get queue status: ${error.message}`);
  }

  const counts: QueueStatusSummary = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    total: 0,
  };

  for (const row of data ?? []) {
    counts.total++;
    const status = row.status as keyof Omit<QueueStatusSummary, "total">;
    if (status in counts) {
      counts[status]++;
    }
  }

  return counts;
}

/**
 * Get all queue items (for display/debugging)
 */
export async function getQueueItems(
  supabase: SupabaseClient,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<DbQueueItem[]> {
  let query = supabase
    .from("generation_queue")
    .select("*")
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: true });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get queue items: ${error.message}`);
  }

  return data as DbQueueItem[];
}

/**
 * Check if an item exists in the queue
 */
export async function queueItemExists(
  supabase: SupabaseClient,
  companySlug: string,
  roleSlug?: string | null
): Promise<boolean> {
  const { data, error } = await supabase
    .from("generation_queue")
    .select("id")
    .eq("company_slug", companySlug)
    .eq("role_slug", roleSlug ?? null)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false;
    }
    throw new Error(`Failed to check queue item: ${error.message}`);
  }

  return !!data;
}

/**
 * Clear completed items from the queue
 */
export async function clearCompleted(
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase
    .from("generation_queue")
    .delete()
    .eq("status", "completed")
    .select("id");

  if (error) {
    throw new Error(`Failed to clear completed items: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Reset stale in_progress items (older than specified minutes)
 */
export async function resetStaleItems(
  supabase: SupabaseClient,
  staleMinutes = 30
): Promise<number> {
  const staleTime = new Date();
  staleTime.setMinutes(staleTime.getMinutes() - staleMinutes);

  const { data, error } = await supabase
    .from("generation_queue")
    .update({
      status: "pending",
      claimed_at: null,
      claimed_by: null,
    })
    .eq("status", "in_progress")
    .lt("claimed_at", staleTime.toISOString())
    .select("id");

  if (error) {
    throw new Error(`Failed to reset stale items: ${error.message}`);
  }

  return data?.length ?? 0;
}
