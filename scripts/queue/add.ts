#!/usr/bin/env ts-node
/**
 * Add items to the generation queue
 *
 * Usage:
 *   npm run queue:add -- --company=google --roles=swe,pm
 *   npm run queue:add -- --company=google  (adds all roles)
 *   npm run queue:add -- --all             (adds all from search_volume.json)
 *   npm run queue:add -- --all --min=50    (only items with priority >= 50)
 *
 * Issue #32 - Generation priority queue system
 */

import { createClient } from "@supabase/supabase-js";
import {
  addToQueue,
  addToQueueBatch,
  buildQueueItemsForCompany,
  buildQueueItemsFromSearchVolume,
  isValidCompanySlug,
  isValidRoleSlug,
  getPriorityScore,
  loadSearchVolumeData,
} from "../../src/lib/queue/index";
import type { AddQueueItemInput } from "../../src/lib/queue/index";

interface CliArgs {
  company?: string;
  roles?: string[];
  all?: boolean;
  min?: number;
  priority?: number;
  dryRun?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--company=")) {
      args.company = arg.split("=")[1];
    } else if (arg.startsWith("--roles=")) {
      args.roles = arg.split("=")[1]?.split(",");
    } else if (arg === "--all") {
      args.all = true;
    } else if (arg.startsWith("--min=")) {
      args.min = parseInt(arg.split("=")[1] ?? "0", 10);
    } else if (arg.startsWith("--priority=")) {
      args.priority = parseInt(arg.split("=")[1] ?? "0", 10);
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

function printUsage(): void {
  console.log(`
Usage:
  npm run queue:add -- --company=<slug> [--roles=<role1,role2>]
  npm run queue:add -- --all [--min=<priority>]
  npm run queue:add -- --company=<slug> --roles=<role> --priority=<override>

Options:
  --company=<slug>       Company slug (e.g., google, apple)
  --roles=<role1,role2>  Comma-separated role slugs (optional, defaults to all roles)
  --all                  Add all companies/roles from search_volume.json
  --min=<priority>       Minimum priority score to include (for --all mode)
  --priority=<override>  Override priority score
  --dry-run              Show what would be added without adding

Examples:
  npm run queue:add -- --company=google --roles=software-engineer
  npm run queue:add -- --company=google
  npm run queue:add -- --all --min=50
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Validate args
  if (!args.company && !args.all) {
    printUsage();
    process.exit(1);
  }

  try {
    // Build items (works without Supabase for dry-run)
    let items: AddQueueItemInput[] = [];

    if (args.all) {
      items = buildQueueItemsFromSearchVolume(args.min ?? 0);
    } else if (args.company) {
      const data = loadSearchVolumeData();
      const isValidCompany = isValidCompanySlug(args.company, data);

      if (!isValidCompany) {
        console.warn(`Warning: Company "${args.company}" not found in search_volume.json`);
        console.warn("Adding with priority 0");
      }

      if (args.roles) {
        for (const role of args.roles) {
          if (!isValidRoleSlug(args.company, role, data)) {
            console.warn(`Warning: Role "${role}" not found for company "${args.company}"`);
          }
        }
      }

      items = args.priority !== undefined
        ? [{
            company_slug: args.company,
            role_slug: args.roles?.[0] ?? null,
            priority_score: args.priority,
          }]
        : buildQueueItemsForCompany(args.company, args.roles, data);
    }

    // Handle dry-run (no Supabase needed)
    if (args.dryRun) {
      console.log(`\nDry run: Would add ${items.length} items to queue:\n`);
      const displayItems = args.all ? items.slice(0, 10) : items;
      for (const item of displayItems) {
        const key = item.role_slug
          ? `${item.company_slug}/${item.role_slug}`
          : item.company_slug;
        console.log(`  ${key} (priority: ${item.priority_score})`);
      }
      if (args.all && items.length > 10) {
        console.log(`  ... and ${items.length - 10} more`);
      }
      process.exit(0);
    }

    // Check for Supabase credentials (only for real operations)
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Error: Missing Supabase credentials");
      console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables");
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Add to queue
    if (items.length === 1) {
      const result = await addToQueue(supabase, items[0]!);
      if (result) {
        const key = result.role_slug
          ? `${result.company_slug}/${result.role_slug}`
          : result.company_slug;
        console.log(`\nAdded to queue: ${key} (priority: ${result.priority_score})`);
      } else {
        console.log("\nItem already exists in queue");
      }
    } else {
      const result = await addToQueueBatch(supabase, items);
      console.log(`\nAdded ${result.added} items to queue (${result.skipped} already existed)`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

// Export for testing
export { parseArgs };
