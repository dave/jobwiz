#!/usr/bin/env npx ts-node

/**
 * Grammar check script for company-role modules
 * Detects:
 * - Garbled/scraped content patterns (multiple ???, informal questions, irrelevant content)
 * - Grammar errors ("1 rounds" instead of "1 round")
 * - Invalid timelines (0 weeks, >11 weeks)
 * - Incomplete sentence fragments
 * - Cut-off text mid-word
 */

import * as fs from 'fs';
import * as path from 'path';

interface ContentBlock {
  id: string;
  type: string;
  content?: string;
  text?: string;
  items?: string[];
  question?: string;
  options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  explanation?: string;
}

interface Section {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface Module {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
}

interface GrammarIssue {
  file: string;
  sectionId: string;
  sectionTitle: string;
  blockId: string;
  blockType: string;
  issue: string;
  text: string;
}

// Patterns that indicate garbled/scraped content
const GARBLED_PATTERNS = [
  /\?\?\?/,                              // Multiple question marks
  /should [Ii] expect/i,                 // Informal questions
  /tell me about your (on-site |phone )?interview/i,  // Interview questions as content
  /here: if you put/i,                   // Incomplete fragments
  /I gave him my/i,                      // Personal anecdotes
  /Are you ready for your training/i,   // Irrelevant content
  /plastics company/i,                   // Random business types
  /Big 4 jobs/i,                         // Generic career advice
  /suit color/i,                         // Dress advice
  /LinkedIn\?\?\?/i,                     // Social media questions
  /or wisdom or related rants/i,        // Meta content about scraping
  /looking at non-tech \(finance/i,     // Generic advice
  /on two sigma phone screen/i,         // Other company content
  /the recruiter or checked out the JD/i, // Recruitment process
  /why not do this as a career/i,       // Career questions
  /you're prepared for \*system design\* questions \(e$/i, // Cut off mid-sentence
  /ensure adequate storage is available/i,  // System requirements
  /Is this an in-person or virtual interview/i, // Interview logistics
  /I see often is to find _anyone_ at a target/i, // Networking advice
  /over a mistake they made/i,          // Incomplete fragments
  /on any other platform like TikTok or IG/i, // Social media content
  /How would you guys approach this given a weeks time/i, // Garbled question
];

// Grammar error patterns
const GRAMMAR_PATTERNS = [
  { pattern: /\b1 rounds\b/i, issue: 'Grammar error: "1 rounds" should be "1 round"' },
  { pattern: /\b0 weeks\b/i, issue: 'Invalid timeline: "0 weeks"' },
  { pattern: /\b(\d{2,}) weeks\b/, issue: 'Suspicious timeline: more than 11 weeks', check: (match: string) => parseInt(match) > 11 },
  { pattern: /\b16 weeks\b/i, issue: 'Invalid timeline: "16 weeks"' },
  { pattern: /\b12 weeks\b/i, issue: 'Invalid timeline: "12 weeks"' },
];

// Incomplete sentence patterns (text that ends abruptly)
const INCOMPLETE_PATTERNS = [
  /\(e$/,                                // Cut off mid-parenthetical
  /Mix of technical$/,                   // Incomplete format description
  /candidates commonly face: \.$/i,      // Empty list
  /[a-z]$/,                              // Ends without punctuation (but skip intentional ... truncation)
];

function extractText(block: ContentBlock): string[] {
  const texts: string[] = [];

  if (typeof block.content === 'string') texts.push(block.content);
  if (typeof block.text === 'string') texts.push(block.text);
  if (typeof block.question === 'string') texts.push(block.question);
  if (typeof block.explanation === 'string') texts.push(block.explanation);
  if (Array.isArray(block.items)) {
    block.items.forEach(item => {
      if (typeof item === 'string') texts.push(item);
    });
  }
  if (Array.isArray(block.options)) {
    block.options.forEach(opt => {
      if (typeof opt.text === 'string') texts.push(opt.text);
    });
  }

  return texts;
}

function checkGrammar(filePath: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const module: Module = JSON.parse(content);
  const fileName = path.basename(filePath);

  for (const section of module.sections) {
    for (const block of section.blocks) {
      const texts = extractText(block);

      for (const text of texts) {
        // Check for garbled patterns
        for (const pattern of GARBLED_PATTERNS) {
          if (pattern.test(text)) {
            issues.push({
              file: fileName,
              sectionId: section.id,
              sectionTitle: section.title,
              blockId: block.id,
              blockType: block.type,
              issue: `Garbled/scraped content detected`,
              text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            });
            break; // Only report first garbled pattern per text
          }
        }

        // Check for grammar patterns
        for (const { pattern, issue, check } of GRAMMAR_PATTERNS) {
          const match = text.match(pattern);
          if (match) {
            if (check && !check(match[1] || match[0])) continue;
            issues.push({
              file: fileName,
              sectionId: section.id,
              sectionTitle: section.title,
              blockId: block.id,
              blockType: block.type,
              issue,
              text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            });
          }
        }

        // Check for incomplete sentences (skip intentional ... truncation)
        if (!text.endsWith('...') && !text.endsWith('.') && !text.endsWith('?') && !text.endsWith('!') && !text.endsWith(':')) {
          // Only flag if it looks like a sentence (has at least 5 words and doesn't start with a bullet marker)
          const words = text.trim().split(/\s+/);
          if (words.length >= 5 && !text.match(/^[-•*]/) && !text.match(/^\*\*[^*]+\*\*$/)) {
            for (const pattern of INCOMPLETE_PATTERNS) {
              if (pattern.test(text)) {
                issues.push({
                  file: fileName,
                  sectionId: section.id,
                  sectionTitle: section.title,
                  blockId: block.id,
                  blockType: block.type,
                  issue: 'Incomplete sentence or cut-off text',
                  text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
                });
                break;
              }
            }
          }
        }
      }
    }
  }

  return issues;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npx ts-node check-grammar.ts <file-or-directory>');
  process.exit(1);
}

const target = args[0]!;
let files: string[] = [];

if (fs.statSync(target).isDirectory()) {
  files = fs.readdirSync(target)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(target, f));
} else {
  files = [target];
}

let totalIssues = 0;
const issuesByFile: Map<string, GrammarIssue[]> = new Map();

for (const file of files) {
  try {
    const issues = checkGrammar(file);
    if (issues.length > 0) {
      issuesByFile.set(path.basename(file), issues);
      totalIssues += issues.length;
    }
  } catch (err) {
    console.error(`Error processing ${file}: ${err}`);
  }
}

if (totalIssues === 0) {
  console.log(`✅ All ${files.length} files passed grammar check`);
} else {
  console.log(`\n❌ Found ${totalIssues} issues in ${issuesByFile.size} files:\n`);

  for (const [fileName, issues] of issuesByFile) {
    console.log(`\n📄 ${fileName}:`);
    for (const issue of issues) {
      console.log(`  - Section: ${issue.sectionTitle} (${issue.sectionId})`);
      console.log(`    Block: ${issue.blockId} (${issue.blockType})`);
      console.log(`    Issue: ${issue.issue}`);
      console.log(`    Text: "${issue.text}"`);
      console.log();
    }
  }
}

console.log(`\nTotal files checked: ${files.length}`);
console.log(`Files with issues: ${issuesByFile.size}`);
console.log(`Total issues: ${totalIssues}`);
