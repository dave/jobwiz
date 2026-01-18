#!/usr/bin/env ts-node
/**
 * View queue status and items
 *
 * Usage:
 *   npm run queue:status                  (show summary)
 *   npm run queue:status -- --pending     (list pending items)
 *   npm run queue:status -- --failed      (list failed items)
 *   npm run queue:status -- --all         (list all items)
 *   npm run queue:status -- --limit=10    (limit number of items)
 *
 * Issue #32 - Generation priority queue system
 */

import { createClient } from "@supabase/supabase-js";
import { getQueueStatus, getQueueItems } from "../../src/lib/queue/index";
import type { DbQueueItem, QueueStatusSummary } from "../../src/lib/queue/index";

interface CliArgs {
  pending?: boolean;
  inProgress?: boolean;
  completed?: boolean;
  failed?: boolean;
  all?: boolean;
  limit?: number;
  json?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};

  for (const arg of process.argv.slice(2)) {
    if (arg === "--pending") {
      args.pending = true;
    } else if (arg === "--in-progress") {
      args.inProgress = true;
    } else if (arg === "--completed") {
      args.completed = true;
    } else if (arg === "--failed") {
      args.failed = true;
    } else if (arg === "--all") {
      args.all = true;
    } else if (arg.startsWith("--limit=")) {
      args.limit = parseInt(arg.split("=")[1] ?? "10", 10);
    } else if (arg === "--json") {
      args.json = true;
    }
  }

  return args;
}

function formatStatus(status: QueueStatusSummary): void {
  const bar = (count: number, total: number): string => {
    if (total === 0) return "";
    const percent = Math.round((count / total) * 100);
    const filled = Math.round(percent / 5);
    return `[${"█".repeat(filled)}${"░".repeat(20 - filled)}] ${percent}%`;
  };

  console.log("\nGeneration Queue Status");
  console.log("═".repeat(50));
  console.log(`  Total:       ${status.total}`);
  console.log(`  Pending:     ${status.pending} ${bar(status.pending, status.total)}`);
  console.log(`  In Progress: ${status.in_progress}`);
  console.log(`  Completed:   ${status.completed} ${bar(status.completed, status.total)}`);
  console.log(`  Failed:      ${status.failed}`);
  console.log("");
}

function formatItem(item: DbQueueItem, index: number): string {
  const key = item.role_slug
    ? `${item.company_slug}/${item.role_slug}`
    : item.company_slug;

  const status =
    item.status === "pending"
      ? "⏳"
      : item.status === "in_progress"
        ? "🔄"
        : item.status === "completed"
          ? "✅"
          : "❌";

  let line = `${index + 1}. ${status} ${key} (priority: ${item.priority_score})`;

  if (item.status === "failed" && item.error_message) {
    line += `\n   Error: ${item.error_message.slice(0, 50)}...`;
  }

  if (item.status === "in_progress" && item.claimed_by) {
    line += ` [claimed by ${item.claimed_by}]`;
  }

  return line;
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
    // Always show status summary first (unless JSON mode)
    const status = await getQueueStatus(supabase);

    if (args.json) {
      // JSON output mode
      const result: { status: QueueStatusSummary; items?: DbQueueItem[] } = { status };

      if (args.pending || args.inProgress || args.completed || args.failed || args.all) {
        const filterStatus = args.all
          ? undefined
          : args.pending
            ? "pending"
            : args.inProgress
              ? "in_progress"
              : args.completed
                ? "completed"
                : "failed";

        result.items = await getQueueItems(supabase, {
          status: filterStatus,
          limit: args.limit ?? 100,
        });
      }

      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    formatStatus(status);

    // Show items if requested
    if (args.pending || args.inProgress || args.completed || args.failed || args.all) {
      const filterStatus = args.all
        ? undefined
        : args.pending
          ? "pending"
          : args.inProgress
            ? "in_progress"
            : args.completed
              ? "completed"
              : "failed";

      const items = await getQueueItems(supabase, {
        status: filterStatus,
        limit: args.limit ?? 10,
      });

      if (items.length === 0) {
        console.log("No items found");
      } else {
        const label = args.all ? "All" : filterStatus ?? "All";
        console.log(`${label.charAt(0).toUpperCase() + label.slice(1)} Items:`);
        console.log("-".repeat(40));
        for (let i = 0; i < items.length; i++) {
          console.log(formatItem(items[i]!, i));
        }
      }
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

// Export for testing
export { parseArgs, formatStatus, formatItem };
