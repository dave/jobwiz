#!/usr/bin/env ts-node

/**
 * Content Orchestration Script
 *
 * Runs the full content generation pipeline:
 * 1. Scraper (optional - uses mock data by default)
 * 2. Company module prompts
 * 3. Role Q&A generation
 * 4. Quality control checks
 * 5. Storage in Supabase
 *
 * Usage:
 *   npm run orchestrate -- --company=google --roles=swe,pm
 *   npm run orchestrate -- --batch --top=100
 *   npm run orchestrate -- --company=google --roles=swe --dry-run
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

interface OrchestrationConfig {
  company: string;
  roles: string[];
  dryRun: boolean;
  batch: boolean;
  top: number;
  verbose: boolean;
  maxRetries: number;
  skipExisting: boolean;
  workerId: string;
}

interface PipelineStep {
  name: string;
  execute: (context: PipelineContext) => Promise<void>;
}

interface PipelineContext {
  config: OrchestrationConfig;
  companySlug: string;
  roleSlug?: string;
  companyName: string;
  roleName: string;
  generatedModule?: GeneratedModule;
  generatedQA?: GeneratedQA;
  qualityResult?: QualityResult;
  errors: string[];
}

interface GeneratedModule {
  id: string;
  slug: string;
  type: string;
  title: string;
  description: string;
  companySlug: string;
  isPremium: boolean;
  order: number;
  sections: Section[];
}

interface Section {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface ContentBlock {
  id: string;
  type: string;
  content?: string;
  question?: string;
  options?: QuizOption[];
  items?: ChecklistItem[];
  title?: string;
  level?: number;
  explanation?: string;
  [key: string]: unknown;
}

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface ChecklistItem {
  id: string;
  text: string;
  required?: boolean;
}

interface GeneratedQA {
  company_slug: string;
  role_slug: string;
  behavioral?: QACategory;
  technical?: QACategory;
  culture?: QACategory;
  curveball?: QACategory;
}

interface QACategory {
  category: string;
  questions: QAQuestion[];
}

interface QAQuestion {
  id: string;
  question: string;
  interviewer_intent: string;
  [key: string]: unknown;
}

interface QualityResult {
  pass: boolean;
  flaggedForReview: boolean;
  readabilityScore: number;
  summary: string;
  checks: {
    repetition: "PASS" | "FAIL";
    readability: "PASS" | "FAIL";
    facts: "PASS" | "REVIEW NEEDED";
  };
}

interface SearchVolumeData {
  companies: Array<{
    name: string;
    slug: string;
    category: string;
    interview_volume: number;
    roles: Array<{
      name: string;
      slug: string;
      volume: number;
    }>;
  }>;
  priority_list: Array<{
    company: string;
    role: string | null;
    score: number;
  }>;
}

interface CompletionRecord {
  completedItems: Array<{
    companySlug: string;
    roleSlug?: string;
    completedAt: string;
    moduleId?: string;
  }>;
}

// ============================================================================
// MOCK DATA (for generating without external APIs)
// ============================================================================

const COMPANY_INFO: Record<string, { name: string; values: string[] }> = {
  google: {
    name: "Google",
    values: ["Cognitive Ability", "Role-Related Knowledge", "Leadership", "Googleyness"],
  },
  amazon: {
    name: "Amazon",
    values: ["Customer Obsession", "Ownership", "Invent and Simplify", "Bias for Action"],
  },
  apple: {
    name: "Apple",
    values: ["Innovation", "Design Excellence", "User Focus", "Privacy"],
  },
  microsoft: {
    name: "Microsoft",
    values: ["Growth Mindset", "Customer Obsession", "Diversity", "One Microsoft"],
  },
  meta: {
    name: "Meta",
    values: ["Move Fast", "Be Bold", "Focus on Impact", "Be Open"],
  },
};

const ROLE_INFO: Record<string, { name: string; competencies: string[] }> = {
  "software-engineer": {
    name: "Software Engineer",
    competencies: ["Problem Solving", "Code Quality", "System Design", "Collaboration"],
  },
  swe: {
    name: "Software Engineer",
    competencies: ["Problem Solving", "Code Quality", "System Design", "Collaboration"],
  },
  "product-manager": {
    name: "Product Manager",
    competencies: ["Product Sense", "Execution", "Strategic Thinking", "Leadership"],
  },
  pm: {
    name: "Product Manager",
    competencies: ["Product Sense", "Execution", "Strategic Thinking", "Leadership"],
  },
  "data-scientist": {
    name: "Data Scientist",
    competencies: ["Statistical Analysis", "Machine Learning", "Data Engineering", "Communication"],
  },
  ds: {
    name: "Data Scientist",
    competencies: ["Statistical Analysis", "Machine Learning", "Data Engineering", "Communication"],
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message: string, verbose = false): void {
  if (!verbose || process.env.VERBOSE === "true") {
    console.log(message);
  }
}

function logProgress(step: string, status: "start" | "done" | "skip" | "error", message = ""): void {
  const icons = { start: "⏳", done: "✓", skip: "○", error: "✗" };
  const icon = icons[status];
  console.log(`  ${icon} ${step}${message ? `: ${message}` : ""}`);
}

// Exposed for testing - can be overridden to skip delays
export let sleepMs = 100;

function sleep(ms: number): Promise<void> {
  // In test mode, skip delays entirely
  if (process.env.NODE_ENV === "test" || sleepMs === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadSearchVolumeData(): SearchVolumeData | null {
  const dataPath = path.join(process.cwd(), "data", "search_volume.json");
  if (!fs.existsSync(dataPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(content) as SearchVolumeData;
  } catch {
    return null;
  }
}

function loadCompletionRecord(): CompletionRecord {
  const recordPath = path.join(process.cwd(), ".orchestration-completed.json");
  if (!fs.existsSync(recordPath)) {
    return { completedItems: [] };
  }
  try {
    const content = fs.readFileSync(recordPath, "utf-8");
    return JSON.parse(content) as CompletionRecord;
  } catch {
    return { completedItems: [] };
  }
}

function saveCompletionRecord(record: CompletionRecord): void {
  const recordPath = path.join(process.cwd(), ".orchestration-completed.json");
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
}

function isAlreadyCompleted(
  record: CompletionRecord,
  companySlug: string,
  roleSlug?: string
): boolean {
  return record.completedItems.some(
    (item) =>
      item.companySlug === companySlug &&
      (roleSlug ? item.roleSlug === roleSlug : !item.roleSlug)
  );
}

function markAsCompleted(
  record: CompletionRecord,
  companySlug: string,
  roleSlug?: string,
  moduleId?: string
): void {
  record.completedItems.push({
    companySlug,
    roleSlug,
    completedAt: new Date().toISOString(),
    moduleId,
  });
  saveCompletionRecord(record);
}

// ============================================================================
// MOCK GENERATORS (simplified versions from generate-module.ts and generate-qa.ts)
// ============================================================================

function generateMockCompanyModule(
  companySlug: string,
  companyName: string,
  companyValues: string[]
): GeneratedModule {
  const mission = `Excellence in ${companyValues[0]?.toLowerCase() ?? "innovation"}`;

  return {
    id: `company-${companySlug}`,
    slug: `company-${companySlug}`,
    type: "company",
    title: `${companyName} Interview Prep`,
    description: `Company-specific interview preparation for ${companyName}`,
    companySlug,
    isPremium: true,
    order: 1,
    sections: [
      {
        id: "culture-values",
        title: "Company Culture & Values",
        blocks: [
          {
            id: "culture-header",
            type: "header",
            content: `What ${companyName} Looks For`,
            level: 2,
          },
          {
            id: "culture-overview",
            type: "text",
            content: `${companyName} evaluates candidates on multiple dimensions.\n\n**Core Values:** ${companyValues.join(", ")}.\n\n**Mission:** ${mission}.\n\nEvery interview answer should connect to these principles.`,
          },
          {
            id: "culture-tip",
            type: "tip",
            content: `When discussing experiences, connect your actions to ${companyName}'s core values.`,
          },
        ],
      },
      {
        id: "interview-process",
        title: "Interview Process",
        blocks: [
          {
            id: "process-header",
            type: "header",
            content: `${companyName}'s Interview Process`,
            level: 2,
          },
          {
            id: "process-overview",
            type: "text",
            content: `Based on candidate reports:\n\n**1. Recruiter Screen (30 min)**\n**2. Technical Phone Screen (45-60 min)**\n**3. On-site/Virtual Loop (4-5 hours)**\n**4. Hiring Committee Review**\n\nTimeline: 4-6 weeks.`,
          },
          {
            id: "process-checklist",
            type: "checklist",
            title: "Pre-Interview Checklist",
            items: [
              { id: "check-1", text: `Research ${companyName}'s recent products`, required: true },
              { id: "check-2", text: "Prepare 5-6 STAR format stories", required: true },
              { id: "check-3", text: "Review interviewers on LinkedIn", required: false },
            ],
          },
        ],
      },
      {
        id: "insider-tips",
        title: "Insider Tips",
        blocks: [
          {
            id: "tips-header",
            type: "header",
            content: "From Those Who've Been There",
            level: 2,
          },
          {
            id: "tips-overview",
            type: "text",
            content: `Successful ${companyName} candidates share common traits:\n\n**Prepared stories:** STAR format is expected.\n\n**Quantified impact:** Numbers make contributions concrete.\n\n**Thoughtful questions:** Your questions reveal your thinking.`,
          },
        ],
      },
      {
        id: "company-trivia",
        title: `${companyName} Trivia`,
        blocks: [
          {
            id: "trivia-header",
            type: "header",
            content: `Know Your ${companyName} Facts`,
            level: 2,
          },
          {
            id: "trivia-quiz",
            type: "quiz",
            question: `Which value is central to ${companyName}'s culture?`,
            options: [
              { id: "q1-a", text: companyValues[0] ?? "Innovation", isCorrect: true },
              { id: "q1-b", text: "Random Value", isCorrect: false },
              { id: "q1-c", text: "Another Value", isCorrect: false },
              { id: "q1-d", text: "Different Value", isCorrect: false },
            ],
            explanation: `${companyValues[0] ?? "Innovation"} is a core value at ${companyName}.`,
          },
        ],
      },
    ],
  };
}

function generateMockQA(
  companySlug: string,
  companyName: string,
  roleSlug: string,
  roleName: string
): GeneratedQA {
  return {
    company_slug: companySlug,
    role_slug: roleSlug,
    behavioral: {
      category: "behavioral",
      questions: [
        {
          id: "beh-leadership-001",
          question: "Tell me about a time you led a project without formal authority.",
          interviewer_intent: `${companyName} looks for emergent leadership - people who step up organically. The interviewer assesses your influence skills and collaboration instincts.`,
          good_answer_demonstrates: ["Influence without authority", "Stakeholder management", "Self-awareness"],
          common_mistakes: ["Taking all credit", "Focusing on WHAT instead of HOW"],
        },
        {
          id: "beh-conflict-002",
          question: "Describe a time you disagreed with a colleague. How did you handle it?",
          interviewer_intent: `${companyName} probes your conflict resolution style. They need people who can disagree constructively and commit after decisions are made.`,
          good_answer_demonstrates: ["Constructive disagreement", "Focus on ideas", "Active listening"],
          common_mistakes: ["Making the other person look bad", "No resolution"],
        },
        {
          id: "beh-failure-003",
          question: "Tell me about your biggest professional failure.",
          interviewer_intent: `${companyName} uses this to assess genuine self-awareness and growth mindset. They want to see you own real mistakes and show concrete learning.`,
          good_answer_demonstrates: ["Self-awareness", "Accountability", "Root cause analysis"],
          common_mistakes: ["Choosing a fake failure", "Blaming others"],
        },
        {
          id: "beh-ambiguity-004",
          question: "Tell me about a time you made a decision with incomplete information.",
          interviewer_intent: `${companyName} operates in uncertainty. They're testing your comfort with ambiguity and judgment about when 'good enough' data is enough to act.`,
          good_answer_demonstrates: ["Comfort with ambiguity", "Judgment", "Risk mitigation"],
          common_mistakes: ["Pretending perfect information", "No risk mitigation"],
        },
        {
          id: "beh-teamwork-005",
          question: "Give me an example of working with someone difficult.",
          interviewer_intent: `${companyName} probes your interpersonal skills and emotional intelligence. They want to see empathy and constructive approaches to challenges.`,
          good_answer_demonstrates: ["Emotional intelligence", "Empathy", "Professional relationship management"],
          common_mistakes: ["Making the other person the villain", "No resolution"],
        },
      ],
    },
    technical: {
      category: "technical",
      questions: roleSlug === "pm" || roleSlug === "product-manager"
        ? [
            {
              id: "tech-metrics-001",
              question: `You're the PM for ${companyName}. How would you measure success for a new feature?`,
              interviewer_intent: `${companyName} tests your product sense and metrics intuition. Start with the goal, not the metric.`,
              good_answer_demonstrates: ["Goal-first thinking", "Trade-off awareness", "Counter-metrics"],
              common_mistakes: ["Listing metrics without connecting to goals", "Only short-term metrics"],
            },
            {
              id: "tech-prioritize-002",
              question: "You have 50 feature requests. How do you prioritize for next quarter?",
              interviewer_intent: `${companyName} probes your prioritization framework. Show structured thinking and stakeholder alignment.`,
              good_answer_demonstrates: ["Clear framework", "Impact vs effort", "Stakeholder input"],
              common_mistakes: ["Pure gut feel", "No stakeholder alignment"],
            },
            {
              id: "tech-estimation-003",
              question: "Estimate the market size for a new product in your domain.",
              interviewer_intent: `${companyName} isn't looking for the right number but structured thinking. Break down the problem and state assumptions.`,
              good_answer_demonstrates: ["Structured decomposition", "Explicit assumptions", "Sanity checking"],
              common_mistakes: ["Random number without work", "Not stating assumptions"],
            },
            {
              id: "tech-product-004",
              question: `Design a feature for ${companyName}'s main product.`,
              interviewer_intent: `${companyName} tests user empathy and structured creativity. Start with understanding the problem before solutions.`,
              good_answer_demonstrates: ["User empathy", "Problem definition", "Structured ideation"],
              common_mistakes: ["Jumping to solutions", "No user research instinct"],
            },
            {
              id: "tech-technical-005",
              question: "How would you work with engineering to define a technical approach?",
              interviewer_intent: `${companyName} tests your technical fluency and collaboration style. Show you can have productive conversations with engineers.`,
              good_answer_demonstrates: ["Technical fluency", "Collaborative approach", "Trade-off understanding"],
              common_mistakes: ["Dictating solutions", "Complete deference"],
            },
          ]
        : [
            {
              id: "tech-algorithm-001",
              question: "Given an array of integers, find two numbers that sum to a target value.",
              interviewer_intent: `${companyName} evaluates your problem-solving process. Clarify constraints, start brute force, then optimize.`,
              good_answer_demonstrates: ["Clarifying questions", "Brute force to optimization", "Complexity analysis"],
              common_mistakes: ["Jumping to code", "Ignoring edge cases"],
            },
            {
              id: "tech-sysdesign-002",
              question: "Design a URL shortening service.",
              interviewer_intent: `${companyName} evaluates communication under pressure. Structure the discussion and articulate trade-offs.`,
              good_answer_demonstrates: ["Structured thinking", "Trade-off articulation", "Scalability intuition"],
              common_mistakes: ["Jumping to database schema", "No trade-offs mentioned"],
            },
            {
              id: "tech-debug-003",
              question: "Walk through debugging a production 500 error that's intermittent.",
              interviewer_intent: `${companyName} assesses your debugging methodology. Be systematic and consider impact mitigation while debugging.`,
              good_answer_demonstrates: ["Systematic approach", "Hypothesis-driven", "Parallel mitigation"],
              common_mistakes: ["Random changes", "No mitigation consideration"],
            },
            {
              id: "tech-code-004",
              question: "Implement an LRU cache with O(1) operations.",
              interviewer_intent: `${companyName} tests whether you can combine multiple data structure concepts under time pressure.`,
              good_answer_demonstrates: ["Understanding O(1) constraint", "Hash map + linked list", "Edge case handling"],
              common_mistakes: ["Missing O(1) requirement", "Messy pointer management"],
            },
            {
              id: "tech-api-005",
              question: "Design an API for a todo list application.",
              interviewer_intent: `${companyName} probes your API design principles. Use REST conventions and think about error handling.`,
              good_answer_demonstrates: ["REST conventions", "Error handling", "Authentication awareness"],
              common_mistakes: ["Only happy path", "Non-RESTful design"],
            },
          ],
    },
    culture: {
      category: "culture",
      questions: [
        {
          id: "cult-ownership-001",
          question: "Tell me about taking on something outside your job description.",
          interviewer_intent: `${companyName} values ownership beyond your immediate role. Show you naturally expand scope when needed.`,
          good_answer_demonstrates: ["Proactive scope expansion", "Comfort with ambiguity", "Genuine enthusiasm"],
          common_mistakes: ["Framing as a burden", "No clear impact"],
        },
        {
          id: "cult-learning-002",
          question: "Describe a time you received critical feedback. How did you respond?",
          interviewer_intent: `${companyName} cultures feedback heavily. Show your growth mindset in action through specific behavior change.`,
          good_answer_demonstrates: ["Non-defensive reception", "Specific behavior change", "Gratitude"],
          common_mistakes: ["Discrediting the source", "No actual change"],
        },
        {
          id: "cult-customer-003",
          question: "Tell me about advocating for the customer when it was inconvenient.",
          interviewer_intent: `${companyName} tests whether you genuinely put customers first. Show real tension and how you balanced interests.`,
          good_answer_demonstrates: ["Genuine customer empathy", "Creative problem-solving", "Cost acknowledged"],
          common_mistakes: ["No real tension", "Ignoring business constraints"],
        },
        {
          id: "cult-speed-004",
          question: "Describe your ideal work environment.",
          interviewer_intent: `${companyName} probes for authentic fit. Be honest about your preferences and let both sides assess fit.`,
          good_answer_demonstrates: ["Self-awareness", "Specific examples", "Honest about limitations"],
          common_mistakes: ["Saying what they want to hear", "Too vague"],
        },
        {
          id: "cult-bias-005",
          question: "Tell me about a time you changed your mind on something you believed strongly.",
          interviewer_intent: `${companyName} values intellectual humility. Show you can update beliefs based on evidence.`,
          good_answer_demonstrates: ["Genuine belief change", "Evidence-based updating", "Humility"],
          common_mistakes: ["Choosing something trivial", "No explanation of what convinced you"],
        },
      ],
    },
    curveball: {
      category: "curveball",
      questions: [
        {
          id: "curve-estimation-001",
          question: "How many golf balls fit in a school bus?",
          interviewer_intent: `${companyName} evaluates structured thinking under pressure. Show your process, not precision.`,
          good_answer_demonstrates: ["Structured decomposition", "Explicit assumptions", "Composure"],
          common_mistakes: ["Freezing", "Random guess without work"],
        },
        {
          id: "curve-pressure-002",
          question: "What's your biggest weakness, and don't give me a fake one.",
          interviewer_intent: `${companyName} tests self-awareness, honesty under pressure, and growth mindset simultaneously.`,
          good_answer_demonstrates: ["Genuine self-awareness", "Evidence of working on it", "Maturity"],
          common_mistakes: ["Humble-brag", "Dealbreaker weakness", "No growth evidence"],
        },
        {
          id: "curve-hypothetical-003",
          question: "If you could have dinner with anyone, who would it be?",
          interviewer_intent: `${companyName} uses this to reveal your values and intellectual curiosity. Pick someone genuinely meaningful.`,
          good_answer_demonstrates: ["Authentic choice", "Clear articulation of why", "Intellectual curiosity"],
          common_mistakes: ["Picking to impress", "No genuine connection"],
        },
        {
          id: "curve-creative-004",
          question: "Design a product for blind people to use smartphones more easily.",
          interviewer_intent: `${companyName} tests user empathy and structured creativity. Acknowledge your perspective limitation.`,
          good_answer_demonstrates: ["User empathy", "Research instinct", "Problem before solution"],
          common_mistakes: ["Jumping to solutions", "Ignoring existing accessibility"],
        },
      ],
    },
  };
}

// ============================================================================
// QUALITY CHECK (simplified from quality-check.ts)
// ============================================================================

const AI_PHRASES = [
  "in conclusion", "in summary", "to summarize", "it is important to note",
  "let's dive in", "let's explore", "first and foremost", "last but not least",
  "without further ado", "it goes without saying", "needless to say",
];

function extractTextFromModule(module: GeneratedModule): string {
  const texts: string[] = [];
  for (const section of module.sections) {
    for (const block of section.blocks) {
      if (block.content) texts.push(block.content);
      if (block.question) texts.push(block.question);
      if (block.title) texts.push(block.title);
    }
  }
  return texts.join(" ");
}

function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

function calculateFleschKincaid(text: string): number {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const syllables = words.reduce((sum, word) => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    return sum + (clean.length > 0 ? countSyllables(clean) : 0);
  }, 0);

  if (words.length === 0 || sentences.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

function runSimplifiedQualityCheck(module: GeneratedModule): QualityResult {
  const text = extractTextFromModule(module);
  const lowerText = text.toLowerCase();

  // Check for AI phrases - only hard fail on these
  const foundAIPhrases = AI_PHRASES.filter((phrase) => lowerText.includes(phrase));
  const repetitionPass = foundAIPhrases.length === 0;

  // Calculate readability - this is a warning, not a hard fail
  const readabilityScore = calculateFleschKincaid(text);
  // Accept wider range for generated content (30-90)
  const readabilityPass = readabilityScore >= 30 && readabilityScore <= 90;

  // Facts always flagged for review (simplified)
  const factsNeedReview = true;

  // Only hard-fail on AI phrases; readability is a soft check
  const pass = repetitionPass;
  const flaggedForReview = factsNeedReview || !readabilityPass;

  const summaryParts: string[] = [];
  if (!repetitionPass) summaryParts.push(`AI phrases detected (${foundAIPhrases.length})`);
  if (!readabilityPass) summaryParts.push(`Readability outside range (${readabilityScore.toFixed(0)})`);
  if (factsNeedReview) summaryParts.push("Facts need verification");
  if (pass && !flaggedForReview) summaryParts.push("All checks passed");
  else if (pass) summaryParts.push("Passed with review needed");

  return {
    pass,
    flaggedForReview,
    readabilityScore,
    summary: summaryParts.join("; "),
    checks: {
      repetition: repetitionPass ? "PASS" : "FAIL",
      readability: readabilityPass ? "PASS" : "FAIL",
      facts: "REVIEW NEEDED",
    },
  };
}

// ============================================================================
// PIPELINE STEPS
// ============================================================================

const pipelineSteps: PipelineStep[] = [
  {
    name: "Generate Company Module",
    execute: async (context: PipelineContext): Promise<void> => {
      const { companySlug, companyName, config } = context;
      const companyValues = COMPANY_INFO[companySlug]?.values ?? ["Innovation", "Excellence"];

      logProgress("Generate Company Module", "start");

      // Simulate API delay for rate limiting
      await sleep(100);

      const module = generateMockCompanyModule(companySlug, companyName, companyValues);
      context.generatedModule = module;

      logProgress("Generate Company Module", "done", `${module.sections.length} sections`);
    },
  },
  {
    name: "Generate Q&A Content",
    execute: async (context: PipelineContext): Promise<void> => {
      const { companySlug, companyName, roleSlug, roleName, config } = context;

      if (!roleSlug) {
        logProgress("Generate Q&A Content", "skip", "No role specified");
        return;
      }

      logProgress("Generate Q&A Content", "start");

      // Simulate API delay
      await sleep(100);

      const qa = generateMockQA(companySlug, companyName, roleSlug, roleName);
      context.generatedQA = qa;

      const questionCount = Object.values(qa)
        .filter((v): v is QACategory => typeof v === "object" && v !== null && "questions" in v)
        .reduce((sum, cat) => sum + cat.questions.length, 0);

      logProgress("Generate Q&A Content", "done", `${questionCount} questions`);
    },
  },
  {
    name: "Quality Control",
    execute: async (context: PipelineContext): Promise<void> => {
      if (!context.generatedModule) {
        logProgress("Quality Control", "skip", "No module generated");
        return;
      }

      logProgress("Quality Control", "start");

      const result = runSimplifiedQualityCheck(context.generatedModule);
      context.qualityResult = result;

      if (!result.pass) {
        context.errors.push(`Quality check failed: ${result.summary}`);
        logProgress("Quality Control", "error", result.summary);
        return;
      }

      logProgress("Quality Control", "done", `Score: ${result.readabilityScore.toFixed(0)}`);
    },
  },
  {
    name: "Store Content",
    execute: async (context: PipelineContext): Promise<void> => {
      const { config, generatedModule, generatedQA, qualityResult } = context;

      if (config.dryRun) {
        logProgress("Store Content", "skip", "Dry run mode");
        return;
      }

      if (!generatedModule || !qualityResult?.pass) {
        logProgress("Store Content", "skip", "No valid content to store");
        return;
      }

      logProgress("Store Content", "start");

      // In dry-run or when Supabase isn't configured, save to output directory
      const outputDir = path.join(process.cwd(), "output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save module
      const moduleFile = path.join(
        outputDir,
        `orchestrated-${context.companySlug}${context.roleSlug ? `-${context.roleSlug}` : ""}.json`
      );
      fs.writeFileSync(moduleFile, JSON.stringify(generatedModule, null, 2));

      // Save Q&A if present
      if (generatedQA) {
        const qaFile = path.join(
          outputDir,
          `qa-${context.companySlug}-${context.roleSlug}.json`
        );
        fs.writeFileSync(qaFile, JSON.stringify(generatedQA, null, 2));
      }

      logProgress("Store Content", "done", `Saved to ${outputDir}`);
    },
  },
];

// ============================================================================
// MAIN ORCHESTRATION FUNCTION
// ============================================================================

async function runPipeline(
  context: PipelineContext,
  maxRetries: number
): Promise<boolean> {
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      context.errors = []; // Reset errors for this attempt

      for (const step of pipelineSteps) {
        await step.execute(context);

        // Stop if critical error occurred
        if (context.errors.length > 0) {
          throw new Error(context.errors.join("; "));
        }
      }

      return true; // Success
    } catch (error) {
      retryCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (retryCount <= maxRetries) {
        console.log(`    ⚠ Attempt ${retryCount} failed: ${errorMessage}`);
        console.log(`    Retrying in ${retryCount * 2} seconds...`);
        await sleep(retryCount * 2000);
      } else {
        console.log(`    ✗ All ${maxRetries + 1} attempts failed`);
        return false;
      }
    }
  }

  return false;
}

export async function orchestrate(config: OrchestrationConfig): Promise<{
  success: boolean;
  processed: number;
  skipped: number;
  failed: number;
}> {
  const results = { success: true, processed: 0, skipped: 0, failed: 0 };
  const completionRecord = loadCompletionRecord();

  console.log("\n" + "=".repeat(60));
  console.log("  CONTENT ORCHESTRATION PIPELINE");
  console.log("=".repeat(60));
  console.log(`  Mode: ${config.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Worker ID: ${config.workerId}`);
  console.log("");

  // Build list of items to process
  interface ProcessItem {
    companySlug: string;
    companyName: string;
    roleSlug?: string;
    roleName: string;
  }

  const items: ProcessItem[] = [];

  if (config.batch) {
    // Batch mode: use search volume data
    const searchData = loadSearchVolumeData();
    if (!searchData) {
      console.error("Error: data/search_volume.json not found for batch mode");
      return { ...results, success: false };
    }

    // Get top N companies by volume
    const topCompanies = searchData.companies.slice(0, config.top);

    for (const company of topCompanies) {
      for (const role of company.roles) {
        items.push({
          companySlug: company.slug,
          companyName: company.name,
          roleSlug: role.slug,
          roleName: role.name,
        });
      }
    }
  } else {
    // Single company mode
    const companyInfo = COMPANY_INFO[config.company.toLowerCase()];
    if (!companyInfo) {
      console.error(`Error: Unknown company '${config.company}'`);
      console.error(`Available: ${Object.keys(COMPANY_INFO).join(", ")}`);
      return { ...results, success: false };
    }

    if (config.roles.length === 0) {
      // Company module only, no roles
      items.push({
        companySlug: config.company.toLowerCase(),
        companyName: companyInfo.name,
        roleName: "",
      });
    } else {
      for (const role of config.roles) {
        const roleInfo = ROLE_INFO[role.toLowerCase()];
        if (!roleInfo) {
          console.warn(`Warning: Unknown role '${role}', skipping`);
          continue;
        }
        items.push({
          companySlug: config.company.toLowerCase(),
          companyName: companyInfo.name,
          roleSlug: role.toLowerCase(),
          roleName: roleInfo.name,
        });
      }
    }
  }

  console.log(`  Items to process: ${items.length}`);
  console.log("");

  // Process each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    const itemLabel = item.roleSlug
      ? `${item.companyName} - ${item.roleName}`
      : `${item.companyName} (company module)`;

    console.log(`[${i + 1}/${items.length}] ${itemLabel}`);

    // Check if already completed
    if (config.skipExisting && isAlreadyCompleted(completionRecord, item.companySlug, item.roleSlug)) {
      console.log("  ○ Already completed, skipping");
      results.skipped++;
      continue;
    }

    const context: PipelineContext = {
      config,
      companySlug: item.companySlug,
      companyName: item.companyName,
      roleSlug: item.roleSlug,
      roleName: item.roleName,
      errors: [],
    };

    const success = await runPipeline(context, config.maxRetries);

    if (success) {
      results.processed++;
      if (!config.dryRun) {
        markAsCompleted(
          completionRecord,
          item.companySlug,
          item.roleSlug,
          context.generatedModule?.id
        );
      }
    } else {
      results.failed++;
      results.success = false;
    }

    console.log("");
  }

  // Summary
  console.log("=".repeat(60));
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Processed: ${results.processed}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Status: ${results.success ? "SUCCESS" : "FAILED"}`);
  console.log("=".repeat(60));

  return results;
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

function parseArgs(): OrchestrationConfig {
  const args = process.argv.slice(2);
  const argMap: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, ...valueParts] = arg.slice(2).split("=");
      if (key) {
        argMap[key] = valueParts.join("=") || "true";
      }
    }
  }

  return {
    company: argMap.company ?? "",
    roles: argMap.roles ? argMap.roles.split(",").map((r) => r.trim()) : [],
    dryRun: "dry-run" in argMap,
    batch: "batch" in argMap,
    top: parseInt(argMap.top ?? "100", 10),
    verbose: "verbose" in argMap || argMap.v === "true",
    maxRetries: parseInt(argMap["max-retries"] ?? "3", 10),
    skipExisting: !("no-skip" in argMap),
    workerId: argMap.worker ?? `worker-${Date.now()}`,
  };
}

function printHelp(): void {
  console.log(`
Content Orchestration Script

Runs the full content generation pipeline for company modules and Q&A.

Usage:
  npm run orchestrate -- --company=google --roles=swe,pm
  npm run orchestrate -- --company=google --roles=swe --dry-run
  npm run orchestrate -- --batch --top=100

Options:
  --company=<slug>      Company slug (e.g., google, amazon, apple)
  --roles=<list>        Comma-separated role slugs (e.g., swe,pm,ds)
  --dry-run             Run without storing to database
  --batch               Process multiple companies from search_volume.json
  --top=<n>             Number of top companies for batch mode (default: 100)
  --max-retries=<n>     Max retry attempts per item (default: 3)
  --no-skip             Don't skip already-completed items
  --worker=<id>         Worker ID for distributed processing
  --verbose             Show detailed output
  --help                Show this help message

Examples:
  # Generate for single company
  npm run orchestrate -- --company=google --roles=swe,pm

  # Dry run (preview without storing)
  npm run orchestrate -- --company=google --roles=swe --dry-run

  # Batch mode for top 10 companies
  npm run orchestrate -- --batch --top=10

  # Re-run failed items (don't skip existing)
  npm run orchestrate -- --batch --top=100 --no-skip
`);
}

async function main(): Promise<void> {
  const config = parseArgs();

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  // Validate config
  if (!config.batch && !config.company) {
    console.error("Error: Either --company or --batch is required");
    printHelp();
    process.exit(1);
  }

  const results = await orchestrate(config);

  process.exit(results.success ? 0 : 1);
}

// Run when executed directly
const isMain =
  process.argv[1]?.includes("orchestrate") ||
  process.argv[1]?.endsWith("orchestrate.ts");

if (isMain) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export type { OrchestrationConfig, PipelineContext, GeneratedModule, GeneratedQA, QualityResult };
