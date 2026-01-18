#!/usr/bin/env npx tsx
/**
 * Export Scraped Reddit Data for Analysis
 *
 * Exports scraped Reddit posts from Supabase into JSON files
 * organized by company, ready for Claude Code analysis sessions.
 *
 * Usage:
 *   npx tsx scripts/export-for-analysis.ts
 *   npx tsx scripts/export-for-analysis.ts --company=google
 *   npx tsx scripts/export-for-analysis.ts --min-posts=5
 *
 * Output:
 *   /data/scraped-exports/{company}.json
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OUTPUT_DIR = path.join(process.cwd(), "data", "scraped-exports");

interface ScrapedPost {
  id: string;
  company_slug: string;
  source: string;
  source_id: string;
  content: string;
  metadata: {
    title: string;
    subreddit: string;
    score: number;
    num_comments: number;
    created_utc: number;
    url: string;
    author: string;
    comments: Array<{
      id: string;
      body: string;
      score: number;
      author: string;
    }>;
  };
  scraped_at: string;
}

interface ExportedPost {
  title: string;
  body: string;
  subreddit: string;
  score: number;
  url: string;
  comments: Array<{
    body: string;
    score: number;
  }>;
}

interface CompanyExport {
  company: string;
  post_count: number;
  exported_at: string;
  posts: ExportedPost[];
}

async function fetchAllPosts(): Promise<ScrapedPost[]> {
  const allPosts: ScrapedPost[] = [];
  const batchSize = 1000;
  let offset = 0;

  console.log("Fetching posts from Supabase...");

  while (true) {
    const { data, error } = await supabase
      .from("scraped_reddit")
      .select("*")
      .range(offset, offset + batchSize - 1)
      .order("company_slug");

    if (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allPosts.push(...(data as ScrapedPost[]));
    offset += batchSize;

    if (data.length < batchSize) break;
  }

  console.log(`Fetched ${allPosts.length} total posts`);
  return allPosts;
}

function groupByCompany(posts: ScrapedPost[]): Map<string, ScrapedPost[]> {
  const grouped = new Map<string, ScrapedPost[]>();

  for (const post of posts) {
    const existing = grouped.get(post.company_slug) || [];
    existing.push(post);
    grouped.set(post.company_slug, existing);
  }

  return grouped;
}

function transformPost(post: ScrapedPost): ExportedPost {
  const meta = post.metadata;
  return {
    title: meta.title || "",
    body: post.content || "",
    subreddit: meta.subreddit || "",
    score: meta.score || 0,
    url: meta.url || "",
    comments: (meta.comments || []).map((c) => ({
      body: c.body,
      score: c.score,
    })),
  };
}

function exportCompany(companySlug: string, posts: ScrapedPost[]): void {
  const exportData: CompanyExport = {
    company: companySlug,
    post_count: posts.length,
    exported_at: new Date().toISOString(),
    posts: posts.map(transformPost),
  };

  const filePath = path.join(OUTPUT_DIR, `${companySlug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
}

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const companyFilter = args
    .find((a) => a.startsWith("--company="))
    ?.split("=")[1];
  const minPosts = parseInt(
    args.find((a) => a.startsWith("--min-posts="))?.split("=")[1] || "1"
  );

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  // Fetch and group posts
  const posts = await fetchAllPosts();
  const grouped = groupByCompany(posts);

  console.log(`Found ${grouped.size} companies`);

  // Export each company
  let exported = 0;
  let skipped = 0;

  for (const [company, companyPosts] of grouped) {
    // Apply filters
    if (companyFilter && company !== companyFilter) continue;
    if (companyPosts.length < minPosts) {
      skipped++;
      continue;
    }

    exportCompany(company, companyPosts);
    exported++;
    console.log(`  ${company}: ${companyPosts.length} posts`);
  }

  console.log(`\nExported ${exported} companies to ${OUTPUT_DIR}`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} companies with < ${minPosts} posts`);
  }

  // Print summary for analysis
  const companies = Array.from(grouped.keys())
    .filter((c) => grouped.get(c)!.length >= minPosts)
    .sort();
  console.log(`\nCompanies available for analysis (${companies.length}):`);
  console.log(companies.join(", "));
}

main().catch(console.error);
