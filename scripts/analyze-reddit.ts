#!/usr/bin/env npx tsx
/**
 * Analyze Scraped Reddit Data
 *
 * Processes exported Reddit data and extracts interview insights.
 * Uses pattern matching and text analysis to identify:
 * - Common interview questions
 * - Recurring themes
 * - Tips and red flags
 *
 * Usage:
 *   npx tsx scripts/analyze-reddit.ts
 *   npx tsx scripts/analyze-reddit.ts --company=google
 *   npx tsx scripts/analyze-reddit.ts --min-posts=10
 */

import * as fs from "fs";
import * as path from "path";

const INPUT_DIR = path.join(process.cwd(), "data", "scraped-exports");
const OUTPUT_DIR = path.join(process.cwd(), "data", "generated", "analysis");

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

interface AnalysisOutput {
  company: string;
  common_questions: string[];
  themes: string[];
  interview_tips: string[];
  red_flags: string[];
  process_insights: {
    typical_rounds: string;
    timeline: string;
    format: string;
  };
  source_count: number;
}

// Question patterns to look for
const QUESTION_PATTERNS = [
  /[""]([^""]+\?)[""]/g, // Quoted questions
  /(?:asked|question was|they asked)[:\s]+[""]?([^"".\n]+\?)/gi,
  /(?:tell me about|describe|explain|walk me through|how would you|why do you|what is your)[^.?\n]{10,80}\??/gi,
  /(?:behavioral|technical|coding|system design) question[s]?[:\s]+([^.\n]+)/gi,
];

// Theme keywords to look for
const THEME_KEYWORDS = {
  "System design emphasis": ["system design", "architecture", "scalability", "design interview"],
  "Heavy focus on coding": ["leetcode", "coding challenge", "algorithm", "data structure", "hackerrank"],
  "Behavioral interviews important": ["behavioral", "star method", "tell me about a time", "leadership principle"],
  "Culture fit matters": ["culture fit", "team fit", "values", "culture interview"],
  "Technical deep dive": ["deep dive", "technical discussion", "past projects", "portfolio review"],
  "Case study format": ["case study", "case interview", "business case"],
  "Multiple interview rounds": ["rounds", "multiple interviews", "5 rounds", "6 rounds", "loop"],
  "Take-home assignment": ["take home", "take-home", "homework", "assignment"],
  "Whiteboard coding": ["whiteboard", "on-site coding"],
  "Virtual interviews": ["virtual", "remote interview", "video call", "zoom"],
  "Panel interviews": ["panel", "multiple interviewers"],
  "Pair programming": ["pair programming", "live coding", "code together"],
};

// Tip patterns
const TIP_PATTERNS = [
  /(?:tip|advice|recommend|suggest|make sure|don't forget)[:\s]+([^.\n]{20,150})/gi,
  /(?:what helped|key to success|important to)[:\s]+([^.\n]{20,150})/gi,
  /(?:I would|you should|always|never)[^.\n]{20,100}/gi,
];

// Red flag patterns
const RED_FLAG_PATTERNS = [
  /(?:don't|avoid|never|mistake|wrong|bad idea)[:\s]+([^.\n]{20,150})/gi,
  /(?:rejected|failed|didn't get|turned down) (?:because|due to|for)[:\s]+([^.\n]{20,150})/gi,
  /(?:red flag|warning|beware)[:\s]+([^.\n]{20,150})/gi,
];

// Process insights patterns
const ROUNDS_PATTERN = /(\d+)[\s-]*(round|interview|stage)/gi;
const TIMELINE_PATTERN = /(\d+)\s*(week|day|month)s?\s*(process|long|took|total)/gi;

function extractQuestions(text: string): string[] {
  const questions = new Set<string>();

  for (const pattern of QUESTION_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const q = (match[1] || match[0]).trim();
      if (q.length > 15 && q.length < 200) {
        questions.add(q);
      }
    }
  }

  return Array.from(questions).slice(0, 15);
}

function extractThemes(text: string): string[] {
  const themes: string[] = [];
  const textLower = text.toLowerCase();

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    const count = keywords.filter(k => textLower.includes(k)).length;
    if (count > 0) {
      themes.push(theme);
    }
  }

  return themes.slice(0, 8);
}

function extractTips(text: string): string[] {
  const tips = new Set<string>();

  for (const pattern of TIP_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const tip = (match[1] || match[0]).trim();
      if (tip.length > 20 && tip.length < 200 && !tip.includes("http")) {
        tips.add(tip);
      }
    }
  }

  return Array.from(tips).slice(0, 10);
}

function extractRedFlags(text: string): string[] {
  const flags = new Set<string>();

  for (const pattern of RED_FLAG_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const flag = (match[1] || match[0]).trim();
      if (flag.length > 20 && flag.length < 200) {
        flags.add(flag);
      }
    }
  }

  return Array.from(flags).slice(0, 8);
}

function extractProcessInsights(text: string): { typical_rounds: string; timeline: string; format: string } {
  const textLower = text.toLowerCase();

  // Extract rounds
  let rounds = "3-5 rounds typical";
  const roundMatches = [...text.matchAll(ROUNDS_PATTERN)];
  if (roundMatches.length > 0) {
    const nums = roundMatches.map(m => parseInt(m[1] || '0')).filter(n => n > 0 && n < 10);
    if (nums.length > 0) {
      const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
      rounds = `${avg} rounds typical`;
    }
  }

  // Extract timeline
  let timeline = "2-4 weeks";
  const timeMatches = [...text.matchAll(TIMELINE_PATTERN)];
  if (timeMatches.length > 0) {
    const weeks = timeMatches.map(m => {
      const num = parseInt(m[1] || '0');
      const unit = (m[2] || '').toLowerCase();
      if (unit.includes("month")) return num * 4;
      if (unit.includes("day")) return num / 7;
      return num;
    }).filter(n => n > 0 && n < 20);
    if (weeks.length > 0) {
      const avg = Math.round(weeks.reduce((a, b) => a + b, 0) / weeks.length);
      timeline = `${avg} weeks`;
    }
  }

  // Determine format
  const formats: string[] = [];
  if (textLower.includes("phone screen")) formats.push("phone screen");
  if (textLower.includes("technical") || textLower.includes("coding")) formats.push("technical");
  if (textLower.includes("behavioral")) formats.push("behavioral");
  if (textLower.includes("on-site") || textLower.includes("onsite")) formats.push("on-site");
  if (textLower.includes("virtual") || textLower.includes("remote")) formats.push("virtual");

  const format = formats.length > 0
    ? `Mix of ${formats.join(", ")}`
    : "Multiple rounds including technical and behavioral";

  return { typical_rounds: rounds, timeline, format };
}

function analyzeCompany(data: CompanyExport): AnalysisOutput {
  // Combine all text for analysis
  const allText = data.posts.map(p => {
    const commentText = p.comments.map(c => c.body).join("\n");
    return `${p.title}\n${p.body}\n${commentText}`;
  }).join("\n\n");

  // Weight by score - prioritize high-scoring content
  const weightedPosts = data.posts
    .sort((a, b) => b.score - a.score)
    .slice(0, 30); // Focus on top 30 posts

  const topText = weightedPosts.map(p => {
    const commentText = p.comments
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(c => c.body)
      .join("\n");
    return `${p.title}\n${p.body}\n${commentText}`;
  }).join("\n\n");

  return {
    company: data.company,
    common_questions: extractQuestions(topText),
    themes: extractThemes(allText),
    interview_tips: extractTips(topText),
    red_flags: extractRedFlags(topText),
    process_insights: extractProcessInsights(allText),
    source_count: data.post_count,
  };
}

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const companyFilter = args
    .find((a) => a.startsWith("--company="))
    ?.split("=")[1];
  const minPosts = parseInt(
    args.find((a) => a.startsWith("--min-posts="))?.split("=")[1] || "5"
  );

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get list of export files
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".json"));
  console.log(`Found ${files.length} company exports`);

  let analyzed = 0;
  let skipped = 0;

  for (const file of files) {
    const company = file.replace(".json", "");

    // Apply filter
    if (companyFilter && company !== companyFilter) continue;

    // Read export
    const data: CompanyExport = JSON.parse(
      fs.readFileSync(path.join(INPUT_DIR, file), "utf-8")
    );

    // Skip if too few posts
    if (data.post_count < minPosts) {
      skipped++;
      continue;
    }

    // Analyze
    const analysis = analyzeCompany(data);

    // Write output
    const outPath = path.join(OUTPUT_DIR, `${company}.json`);
    fs.writeFileSync(outPath, JSON.stringify(analysis, null, 2));

    console.log(`  ${company}: ${analysis.themes.length} themes, ${analysis.common_questions.length} questions`);
    analyzed++;
  }

  console.log(`\nAnalyzed ${analyzed} companies`);
  console.log(`Skipped ${skipped} companies with < ${minPosts} posts`);
  console.log(`Output written to ${OUTPUT_DIR}`);
}

main().catch(console.error);
