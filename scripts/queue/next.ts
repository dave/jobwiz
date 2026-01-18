#!/usr/bin/env ts-node
/**
 * Get the next item from the generation queue
 *
 * Usage:
 *   npm run queue:next                    (claim and print next item)
 *   npm run queue:next -- --peek          (show next item without claiming)
 *   npm run queue:next -- --worker=worker1 (specify worker name)
 *
 * Issue #32 - Generation priority queue system
 */

import { createClient } from "@supabase/supabase-js";
import { claimNextItem, getQueueItems } from "../../src/lib/queue/index";
import type { DbQueueItem } from "../../src/lib/queue/index";

interface CliArgs {
  peek?: boolean;
  worker?: string;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};

  for (const arg of process.argv.slice(2)) {
    if (arg === "--peek") {
      args.peek = true;
    } else if (arg.startsWith("--worker=")) {
      args.worker = arg.split("=")[1];
    }
  }

  return args;
}

function formatQueueItem(item: DbQueueItem): string {
  const key = item.role_slug
    ? `${item.company_slug}/${item.role_slug}`
    : item.company_slug;
  return `${key} (priority: ${item.priority_score})`;
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Check for Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Missing Supabase credentials");
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    if (args.peek) {
      // Just peek at the next item without claiming
      const items = await getQueueItems(supabase, { status: "pending", limit: 1 });

      if (items.length === 0) {
        console.log("No pending items in queue");
        process.exit(0);
      }

      const item = items[0]!;
      console.log(`\nNext item: ${formatQueueItem(item)}`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Created: ${item.created_at}`);
      console.log(`  Retries: ${item.retry_count}/${item.max_retries}`);
    } else {
      // Claim the next item
      const workerName = args.worker ?? `worker-${process.pid}`;
      const item = await claimNextItem(supabase, workerName);

      if (!item) {
        console.log("No pending items in queue");
        process.exit(0);
      }

      console.log(`\nClaimed: ${formatQueueItem(item)}`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Worker: ${workerName}`);
      console.log(`  Claimed at: ${item.claimed_at}`);

      // Output JSON for scripting
      console.log(`\n${JSON.stringify(item, null, 2)}`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

// Export for testing
export { parseArgs, formatQueueItem };
