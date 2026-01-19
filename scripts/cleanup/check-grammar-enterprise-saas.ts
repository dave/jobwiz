import * as fs from 'fs';
import * as path from 'path';

// Patterns that indicate garbled/scraped content (NOT regular interview questions)
const GARBLED_PATTERNS = [
  /\?\?\?+/,  // Multiple question marks
  /^(Is this an|How do I use|should I expect|So do you know)/i,  // Informal questions (not "Tell me about")
  /\b(plastics company|bank.*routing.*account|suit color)/i,  // Obvious irrelevant scraped content
];

// Grammar patterns
const GRAMMAR_ISSUES = [
  { pattern: /\b1 rounds\b/gi, description: '1 rounds (should be "1 round")' },
  { pattern: /\b(ensure adequate storage|here: if you|I see often is)/i, description: 'Garbled scraped content' },
];

interface ContentBlock {
  id: string;
  type: string;
  content?: string | {
    text?: string;
    question?: string;
    explanation?: string;
    options?: Array<{ text: string; isCorrect?: boolean }>;
    items?: string[];
  };
  question?: string;
  explanation?: string;
  options?: Array<{ text: string }>;
  text?: string;
  items?: string[];
}

interface Section {
  title: string;
  blocks: ContentBlock[];
}

interface Module {
  id: string;
  title: string;
  sections: Section[];
}

function extractAllText(module: Module): string[] {
  const texts: string[] = [];

  for (const section of module.sections || []) {
    for (const block of section.blocks || []) {
      // Handle flat structure
      if (typeof block.content === 'string') texts.push(block.content);
      if (typeof block.question === 'string') texts.push(block.question);
      if (typeof block.explanation === 'string') texts.push(block.explanation);
      if (typeof block.text === 'string') texts.push(block.text);
      if (Array.isArray(block.items)) {
        texts.push(...block.items.filter((i): i is string => typeof i === 'string'));
      }
      if (Array.isArray(block.options)) {
        texts.push(...block.options.map(o => o.text).filter((t): t is string => typeof t === 'string'));
      }

      // Handle nested content structure
      if (typeof block.content === 'object' && block.content !== null) {
        const content = block.content;
        if (typeof content.text === 'string') texts.push(content.text);
        if (typeof content.question === 'string') texts.push(content.question);
        if (typeof content.explanation === 'string') texts.push(content.explanation);
        if (Array.isArray(content.items)) {
          texts.push(...content.items.filter((i): i is string => typeof i === 'string'));
        }
        if (Array.isArray(content.options)) {
          texts.push(...content.options.map(o => o.text).filter((t): t is string => typeof t === 'string'));
        }
      }
    }
  }

  return texts;
}

function checkFile(filePath: string): { file: string; issues: string[] } {
  const issues: string[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const module: Module = JSON.parse(content);
    const texts = extractAllText(module);

    for (const text of texts) {
      // Skip intentional ellipses in explanations
      if (text.endsWith('...') && text.length > 50) continue;

      // Check for garbled scraped content
      for (const pattern of GARBLED_PATTERNS) {
        if (pattern.test(text)) {
          issues.push(`Garbled content: "${text.slice(0, 100)}..."`);
        }
      }

      // Check for grammar issues
      for (const { pattern, description } of GRAMMAR_ISSUES) {
        if (pattern.test(text)) {
          issues.push(`${description}: "${text.slice(0, 100)}..."`);
        }
      }

      // Check for incomplete sentences (text that ends mid-word or with incomplete markdown)
      if (/[a-z]\*\*$/.test(text) || /\b(technical|behavioral|phone)\s*$/.test(text.toLowerCase())) {
        issues.push(`Incomplete text: "${text.slice(-50)}"`);
      }

      // Check for improperly capitalized questions at the start
      if (/^[a-z].*\?$/.test(text.trim()) && text.length > 10) {
        issues.push(`Improperly capitalized question: "${text.slice(0, 60)}..."`);
      }
    }
  } catch (e) {
    issues.push(`Error parsing file: ${e}`);
  }

  return { file: path.basename(filePath), issues };
}

// Get files from command line
const files = process.argv.slice(2);
let totalIssues = 0;
let filesWithIssues = 0;

for (const file of files) {
  const result = checkFile(file);
  if (result.issues.length > 0) {
    console.log(`\n${result.file}:`);
    for (const issue of result.issues) {
      console.log(`  - ${issue}`);
    }
    totalIssues += result.issues.length;
    filesWithIssues++;
  }
}

console.log(`\n\nTotal files checked: ${files.length}`);
console.log(`Files with issues: ${filesWithIssues}`);
console.log(`Total issues found: ${totalIssues}`);
