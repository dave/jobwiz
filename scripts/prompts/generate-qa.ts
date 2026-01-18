#!/usr/bin/env ts-node

/**
 * Generates Q&A content with psychology explanations using prompts.
 *
 * Usage:
 *   npm run generate-qa -- --company=google --role=swe --type=behavioral --dry-run
 *   npm run generate-qa -- --company=amazon --role=pm --type=all --output=output/
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

// ============================================================================
// Validation Schemas (inlined for CLI compatibility)
// ============================================================================

const BehavioralFrameworkSchema = z.object({
  structure: z.string().min(1),
  key_elements: z.array(z.string().min(1)).min(4).max(6),
  time_allocation: z.string().min(1),
});

const TechnicalFrameworkSchema = z.object({
  approach: z.string().min(1),
  key_elements: z.array(z.string().min(1)).min(4).max(6),
  follow_up_prep: z.string().min(1),
});

const CultureFrameworkSchema = z.object({
  authenticity_check: z.string().min(1),
  key_elements: z.array(z.string().min(1)).min(4).max(6),
  red_flags_to_avoid: z.array(z.string().min(1)).min(2).max(3),
});

const CurveballFrameworkSchema = z.object({
  composure_tip: z.string().min(1),
  approach: z.string().min(1),
  key_elements: z.array(z.string().min(1)).min(4).max(6),
});

const DifficultySchema = z.enum(["easy", "medium", "hard"]);
const CurveballTypeSchema = z.enum(["estimation", "hypothetical", "self-reflection", "creative", "pressure"]);

const BehavioralQuestionSchema = z.object({
  id: z.string().regex(/^beh-[a-z]+-\d{3}$/),
  question: z.string().min(10),
  interviewer_intent: z.string().min(50).max(500),
  good_answer_demonstrates: z.array(z.string().min(1)).min(3).max(5),
  common_mistakes: z.array(z.string().min(1)).min(3).max(4),
  answer_framework: BehavioralFrameworkSchema,
  difficulty: DifficultySchema,
  tags: z.array(z.string().min(1)).min(1),
});

const TechnicalQuestionSchema = z.object({
  id: z.string().regex(/^tech-[a-z]+-\d{3}$/),
  question: z.string().min(10),
  interviewer_intent: z.string().min(50).max(500),
  good_answer_demonstrates: z.array(z.string().min(1)).min(3).max(5),
  common_mistakes: z.array(z.string().min(1)).min(3).max(4),
  answer_framework: TechnicalFrameworkSchema,
  difficulty: DifficultySchema,
  tags: z.array(z.string().min(1)).min(1),
});

const CultureQuestionSchema = z.object({
  id: z.string().regex(/^cult-[a-z]+-\d{3}$/),
  question: z.string().min(10),
  interviewer_intent: z.string().min(50).max(500),
  target_value: z.string().min(1),
  good_answer_demonstrates: z.array(z.string().min(1)).min(3).max(5),
  common_mistakes: z.array(z.string().min(1)).min(3).max(4),
  answer_framework: CultureFrameworkSchema,
  difficulty: DifficultySchema,
  tags: z.array(z.string().min(1)).min(1),
});

const CurveballQuestionSchema = z.object({
  id: z.string().regex(/^curve-[a-z]+-\d{3}$/),
  question: z.string().min(10),
  question_type: CurveballTypeSchema,
  interviewer_intent: z.string().min(50).max(500),
  good_answer_demonstrates: z.array(z.string().min(1)).min(3).max(5),
  common_mistakes: z.array(z.string().min(1)).min(3).max(4),
  answer_framework: CurveballFrameworkSchema,
  difficulty: z.enum(["medium", "hard"]),
  tags: z.array(z.string().min(1)).min(1),
});

const BehavioralQAOutputSchema = z.object({
  category: z.literal("behavioral"),
  company_slug: z.string().min(1),
  role_slug: z.string().min(1),
  questions: z.array(BehavioralQuestionSchema).min(5).max(8),
});

const TechnicalQAOutputSchema = z.object({
  category: z.literal("technical"),
  company_slug: z.string().min(1),
  role_slug: z.string().min(1),
  questions: z.array(TechnicalQuestionSchema).min(5).max(8),
});

const CultureQAOutputSchema = z.object({
  category: z.literal("culture"),
  company_slug: z.string().min(1),
  role_slug: z.string().min(1),
  questions: z.array(CultureQuestionSchema).min(5).max(7),
});

const CurveballQAOutputSchema = z.object({
  category: z.literal("curveball"),
  company_slug: z.string().min(1),
  role_slug: z.string().min(1),
  questions: z.array(CurveballQuestionSchema).min(4).max(6),
});

type QACategory = "behavioral" | "technical" | "culture" | "curveball";

const QA_SCHEMAS: Record<QACategory, z.ZodSchema> = {
  behavioral: BehavioralQAOutputSchema,
  technical: TechnicalQAOutputSchema,
  culture: CultureQAOutputSchema,
  curveball: CurveballQAOutputSchema,
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function checkUniqueIds(data: unknown): string[] {
  const ids: string[] = [];
  const duplicates: string[] = [];

  function traverse(obj: unknown): void {
    if (obj && typeof obj === "object") {
      if ("id" in obj && typeof (obj as Record<string, unknown>).id === "string") {
        const id = (obj as Record<string, unknown>).id as string;
        if (ids.includes(id)) {
          duplicates.push(id);
        } else {
          ids.push(id);
        }
      }
      Object.values(obj as Record<string, unknown>).forEach(traverse);
    }
  }

  traverse(data);
  return duplicates;
}

function validateQAOutput(data: unknown, category: QACategory): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };

  const schema = QA_SCHEMAS[category];
  if (!schema) {
    result.valid = false;
    result.errors.push(`Unknown Q&A category: ${category}`);
    return result;
  }

  const parseResult = schema.safeParse(data);
  if (!parseResult.success) {
    result.valid = false;
    result.errors.push("Schema validation failed:");
    for (const issue of parseResult.error.issues) {
      result.errors.push(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    return result;
  }

  const duplicateIds = checkUniqueIds(data);
  if (duplicateIds.length > 0) {
    result.valid = false;
    result.errors.push(`Duplicate IDs found: ${duplicateIds.join(", ")}`);
  }

  return result;
}

// ============================================================================
// Types
// ============================================================================

interface PositionInfo {
  company_slug: string;
  company_name: string;
  role_slug: string;
  role_name: string;
  company_values: string[];
  role_competencies: string[];
  tech_stack?: string[];
}

interface GenerationConfig {
  company: string;
  role: string;
  type: QACategory | "all";
  dryRun: boolean;
  outputDir: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const COMPANY_INFO: Record<string, { name: string; values: string[] }> = {
  google: {
    name: "Google",
    values: ["Cognitive Ability", "Role-Related Knowledge", "Leadership", "Googleyness"],
  },
  amazon: {
    name: "Amazon",
    values: ["Customer Obsession", "Ownership", "Invent and Simplify", "Bias for Action", "Hire and Develop the Best"],
  },
  meta: {
    name: "Meta",
    values: ["Move Fast", "Be Bold", "Focus on Impact", "Be Open", "Build Social Value"],
  },
};

const ROLE_INFO: Record<string, { name: string; competencies: string[]; tech_stack?: string[] }> = {
  swe: {
    name: "Software Engineer",
    competencies: ["Problem Solving", "Code Quality", "System Design", "Collaboration", "Technical Communication"],
    tech_stack: ["Algorithms", "Data Structures", "System Design", "Coding"],
  },
  pm: {
    name: "Product Manager",
    competencies: ["Product Sense", "Execution", "Strategic Thinking", "Leadership", "Analytical Skills"],
    tech_stack: ["Metrics", "A/B Testing", "Prioritization", "Technical Fluency"],
  },
  ds: {
    name: "Data Scientist",
    competencies: ["Statistical Analysis", "Machine Learning", "Data Engineering", "Business Acumen", "Communication"],
    tech_stack: ["Python", "SQL", "Statistics", "ML Models"],
  },
};

// ============================================================================
// Mock Question Generators
// ============================================================================

function generateMockBehavioral(position: PositionInfo) {
  const { company_slug, company_name, role_slug, company_values } = position;

  return {
    category: "behavioral" as const,
    company_slug,
    role_slug,
    questions: [
      {
        id: "beh-leadership-001",
        question: "Tell me about a time you had to lead a project without formal authority.",
        interviewer_intent: `${company_name} looks for 'emergent leadership' - people who step up organically without needing titles. The interviewer is assessing your influence skills: can you get buy-in from peers? Do you lead through expertise and trust, or do you rely on hierarchy? They're also watching HOW you describe the team - candidates who minimize others' roles reveal poor collaboration instincts that won't work in ${company_name}'s culture.`,
        good_answer_demonstrates: [
          "Influence without authority",
          "Stakeholder management",
          "Self-awareness about leadership style",
          "Credit-sharing with team members",
          "Outcome-focus over ego",
        ],
        common_mistakes: [
          "Taking all credit (saying 'I' too much, never 'we')",
          "Focusing on the WHAT instead of the HOW of leadership",
          "Describing coercion as influence",
          "Skipping the outcome or metrics",
        ],
        answer_framework: {
          structure: "STAR with leadership lens",
          key_elements: [
            "Why you stepped up (not because you had to)",
            "How you built alignment without authority",
            "Specific influence tactics used",
            "How you handled resistance",
            "Measurable outcome",
            "What you'd do differently",
          ],
          time_allocation: "Situation: 15%, Task: 10%, Action: 55%, Result: 20%",
        },
        difficulty: "medium" as const,
        tags: ["leadership", "influence", "collaboration"],
      },
      {
        id: "beh-conflict-002",
        question: "Describe a time you disagreed with a colleague or manager. How did you handle it?",
        interviewer_intent: `The interviewer is probing your conflict resolution style. ${company_name} needs people who can disagree constructively - not pushovers, but not bulldozers either. They're listening for: Did you raise the concern or stay silent? Did you attack the person or focus on the idea? Did you know when to commit even if you disagreed? The meta-skill here is 'disagree and commit' - can you advocate strongly, then fully support the decision once made?`,
        good_answer_demonstrates: [
          "Constructive disagreement",
          "Focus on ideas, not personalities",
          "Active listening",
          "Disagree and commit mentality",
          "Professional relationship maintenance",
        ],
        common_mistakes: [
          "Making the other person look bad",
          "Framing yourself as always right",
          "No resolution or learning",
          "Avoiding the conflict entirely",
        ],
        answer_framework: {
          structure: "STAR with resolution focus",
          key_elements: [
            "The specific disagreement (not vague)",
            "Your perspective AND theirs (shows empathy)",
            "How you raised the concern",
            "The discussion process",
            "The resolution and why it worked",
            "What the relationship looked like after",
          ],
          time_allocation: "Situation: 20%, Task: 10%, Action: 50%, Result: 20%",
        },
        difficulty: "medium" as const,
        tags: ["conflict", "communication", "collaboration"],
      },
      {
        id: "beh-failure-003",
        question: "Tell me about your biggest professional failure and what you learned from it.",
        interviewer_intent: `${company_name} uses this question to assess genuine self-awareness and growth mindset. The interviewer is NOT looking for a humble-brag disguised as failure. They want to see: Can you own a real mistake? Do you understand the root cause, not just the symptoms? Have you actually changed behavior as a result? The best answers show vulnerability and concrete learning - candidates who've 'never really failed' reveal either dishonesty or lack of ambition.`,
        good_answer_demonstrates: [
          "Genuine self-awareness",
          "Accountability without excuses",
          "Root cause analysis",
          "Concrete behavior change",
          "Growth mindset in action",
        ],
        common_mistakes: [
          "Choosing a fake failure (too small to matter)",
          "Blaming others or circumstances",
          "No actual learning or change",
          "Being defensive when probed",
        ],
        answer_framework: {
          structure: "Failure-Analysis-Change-Evidence",
          key_elements: [
            "The actual failure (be specific and real)",
            "Your role (not just 'we failed')",
            "Root cause analysis",
            "Specific changes you made",
            "Evidence the change stuck",
            "How you'd approach it now",
          ],
          time_allocation: "Failure: 25%, Analysis: 25%, Change: 35%, Evidence: 15%",
        },
        difficulty: "hard" as const,
        tags: ["failure", "growth", "self-awareness"],
      },
      {
        id: "beh-ambiguity-004",
        question: "Tell me about a time you had to make a decision with incomplete information.",
        interviewer_intent: `${company_name} operates in uncertainty constantly. The interviewer is testing your comfort with ambiguity: Do you freeze without perfect data, or can you move forward thoughtfully? They're also watching for judgment - did you gather the RIGHT information, not just MORE information? The meta-question is: do you know when 'good enough' data is enough to act, or do you hide behind 'needing more research'?`,
        good_answer_demonstrates: [
          "Comfort with ambiguity",
          "Judgment about what information matters",
          "Bias for action over analysis paralysis",
          "Risk assessment and mitigation",
          "Learning from the outcome",
        ],
        common_mistakes: [
          "Pretending you had perfect information",
          "Not explaining your reasoning process",
          "No risk mitigation mentioned",
          "Ignoring the outcome or learnings",
        ],
        answer_framework: {
          structure: "Context-Decision-Process-Outcome",
          key_elements: [
            "The ambiguous situation",
            "What information you DID have",
            "What you chose NOT to wait for and why",
            "How you mitigated risk",
            "The decision and rationale",
            "The outcome and what you'd do differently",
          ],
          time_allocation: "Context: 20%, Process: 40%, Decision: 20%, Outcome: 20%",
        },
        difficulty: "hard" as const,
        tags: ["ambiguity", "decision-making", "judgment"],
      },
      {
        id: "beh-teamwork-005",
        question: "Give me an example of a time you had to work with someone difficult. How did you handle it?",
        interviewer_intent: `The interviewer is probing your interpersonal skills and emotional intelligence. ${company_name} values collaboration, but they know not everyone is easy to work with. They're watching for: Do you dismiss difficult people or try to understand them? Can you separate the person from the behavior? Do you take ownership of your part in the dynamic? Bonus points if you can describe turning the relationship around.`,
        good_answer_demonstrates: [
          "Emotional intelligence",
          "Empathy for difficult colleagues",
          "Constructive approach to challenges",
          "Self-awareness about your role",
          "Professional relationship management",
        ],
        common_mistakes: [
          "Making the other person the villain",
          "No empathy for their perspective",
          "Escalating to management too quickly",
          "No resolution or working relationship maintained",
        ],
        answer_framework: {
          structure: "STAR with empathy layer",
          key_elements: [
            "The specific difficulty (behavior, not personality)",
            "Your initial reaction (honest)",
            "How you tried to understand their perspective",
            "Specific tactics you used",
            "The outcome for the work AND the relationship",
            "What you learned about yourself",
          ],
          time_allocation: "Situation: 15%, Task: 10%, Action: 55%, Result: 20%",
        },
        difficulty: "medium" as const,
        tags: ["teamwork", "emotional-intelligence", "conflict"],
      },
    ],
  };
}

function generateMockTechnical(position: PositionInfo) {
  const { company_slug, company_name, role_slug, role_name, tech_stack = [] } = position;

  const isSWE = role_slug === "swe";
  const isPM = role_slug === "pm";

  const questions = isSWE
    ? [
        {
          id: "tech-algorithm-001",
          question: "Given an array of integers, find two numbers that sum to a target value.",
          interviewer_intent: `This is a classic problem, but ${company_name} isn't testing if you've memorized the solution. They're evaluating your problem-solving process: Do you clarify constraints first? Do you start with a brute force approach and then optimize? Can you articulate trade-offs between time and space complexity? Most importantly, can you think out loud clearly while coding under pressure?`,
          good_answer_demonstrates: [
            "Clarifying questions before coding",
            "Brute force to optimization progression",
            "Time/space complexity analysis",
            "Clean, readable code",
            "Edge case handling",
          ],
          common_mistakes: [
            "Jumping to code without clarifying",
            "Only knowing the optimal solution (not showing process)",
            "Ignoring edge cases (empty array, duplicates)",
            "Silent coding without explanation",
          ],
          answer_framework: {
            approach: "Clarify -> Brute force -> Optimize -> Code -> Test",
            key_elements: [
              "Clarify: Can there be duplicates? Negative numbers?",
              "Brute force: O(n^2) nested loops",
              "Optimize: Hash map for O(n)",
              "Code with clear variable names",
              "Test with edge cases",
              "Discuss space/time trade-offs",
            ],
            follow_up_prep: "Expect: 'What if the array is sorted?' or 'Find all pairs' or 'Handle duplicates differently'",
          },
          difficulty: "easy" as const,
          tags: ["algorithms", "hash-maps", "arrays"],
        },
        {
          id: "tech-sysdesign-002",
          question: "Design a URL shortening service like bit.ly.",
          interviewer_intent: `${company_name} knows this is a well-documented problem. They're not testing novel thinking - they're evaluating your communication style under pressure. Can you structure a complex discussion? Do you ask clarifying questions or make dangerous assumptions? They're also watching for depth - when they push on one area, can you go deep while acknowledging trade-offs you'd research more in production?`,
          good_answer_demonstrates: [
            "Structured thinking (requirements -> design -> deep dive)",
            "Trade-off articulation (not just listing options)",
            "Scalability intuition",
            "Knowing when to say 'I'd research this more'",
            "Connecting technical choices to product requirements",
          ],
          common_mistakes: [
            "Jumping to database schema before clarifying scale",
            "Giving a 'right answer' without showing trade-offs",
            "Ignoring the analytics/tracking dimension",
            "Not addressing collision handling for shortened URLs",
          ],
          answer_framework: {
            approach: "Requirements -> Estimates -> High-level design -> Deep dive -> Trade-offs",
            key_elements: [
              "Functional requirements (what exactly does it do?)",
              "Non-functional (scale, latency, availability)",
              "Back-of-envelope math (QPS, storage)",
              "High-level components (API, storage, shortening logic)",
              "One deep dive (e.g., ID generation strategy)",
              "Trade-offs acknowledged",
            ],
            follow_up_prep: "Expect: 'What if we need analytics?' or 'How do we handle expiring links?' or 'Walk me through the read path at 10x scale.'",
          },
          difficulty: "hard" as const,
          tags: ["system-design", "scalability", "distributed-systems"],
        },
        {
          id: "tech-debug-003",
          question: "Walk me through how you would debug a production issue where the service is returning 500 errors intermittently.",
          interviewer_intent: `${company_name} is assessing your debugging methodology under pressure. The key word is 'intermittent' - this requires systematic thinking, not random poking. They're watching for: Do you have a mental framework? Do you isolate variables? Can you balance urgency with thoroughness? Senior interviewers also watch if you consider impact mitigation WHILE debugging, not just after.`,
          good_answer_demonstrates: [
            "Systematic debugging methodology",
            "Log and metric analysis",
            "Hypothesis-driven investigation",
            "Parallel mitigation while debugging",
            "Root cause vs. symptom distinction",
          ],
          common_mistakes: [
            "Random changes without hypothesis",
            "Ignoring metrics/logs in favor of code reading",
            "No consideration of impact mitigation",
            "Stopping at first symptom, not root cause",
          ],
          answer_framework: {
            approach: "Observe -> Hypothesize -> Test -> Mitigate -> Root cause",
            key_elements: [
              "Check dashboards/alerts for correlation",
              "Review recent deployments",
              "Look at error logs and patterns",
              "Form hypothesis and test systematically",
              "Consider mitigation (rollback, feature flag)",
              "Document findings and prevent recurrence",
            ],
            follow_up_prep: "Expect: 'The error correlates with high traffic' or 'Logs don't show anything unusual' or 'How do you prevent this from happening again?'",
          },
          difficulty: "medium" as const,
          tags: ["debugging", "production", "operations"],
        },
        {
          id: "tech-code-004",
          question: "Implement an LRU cache with O(1) get and put operations.",
          interviewer_intent: `This is a classic data structure problem that tests whether you can combine multiple concepts. ${company_name} is evaluating: Do you understand WHY this requires a hash map + doubly-linked list? Can you implement clean code under time pressure? Do you handle edge cases like capacity limits and key updates? The 'O(1)' constraint is the key - candidates who miss it reveal they're not reading problems carefully.`,
          good_answer_demonstrates: [
            "Understanding the O(1) constraint implications",
            "Hash map + linked list combination",
            "Clean API design",
            "Edge case handling (capacity, updates)",
            "Ability to implement under time pressure",
          ],
          common_mistakes: [
            "Missing the O(1) requirement (using array shifting)",
            "Forgetting to update on get, not just put",
            "Not handling capacity limit correctly",
            "Messy linked list pointer management",
          ],
          answer_framework: {
            approach: "Understand requirements -> Design data structures -> Implement -> Test",
            key_elements: [
              "Explain why O(1) requires hash map + linked list",
              "Define the Node and LRUCache classes",
              "Implement get: lookup + move to front",
              "Implement put: add/update + evict if needed",
              "Test with capacity edge cases",
              "Discuss thread safety if time permits",
            ],
            follow_up_prep: "Expect: 'How would you make this thread-safe?' or 'What if we need TTL-based expiration?' or 'Implement resize()'",
          },
          difficulty: "hard" as const,
          tags: ["data-structures", "hash-maps", "linked-lists"],
        },
        {
          id: "tech-api-005",
          question: "Design an API for a todo list application. What endpoints would you create?",
          interviewer_intent: `This seems simple, but ${company_name} uses it to probe your API design principles. They're evaluating: Do you use REST conventions correctly? Do you think about error handling and edge cases? Can you discuss versioning, pagination, and authentication? The real test is whether you ask clarifying questions or assume you know what a 'todo app' needs.`,
          good_answer_demonstrates: [
            "REST convention understanding",
            "Resource-oriented thinking",
            "Error handling consideration",
            "Authentication/authorization awareness",
            "Versioning and evolution planning",
          ],
          common_mistakes: [
            "Only happy path endpoints (no error states)",
            "Non-RESTful design (verbs in URLs)",
            "Ignoring pagination for list endpoints",
            "No authentication discussion",
          ],
          answer_framework: {
            approach: "Resources -> Endpoints -> Request/Response -> Errors -> Auth",
            key_elements: [
              "Identify resources (todos, users, lists?)",
              "CRUD endpoints with proper HTTP methods",
              "Request/response schemas",
              "Error codes and messages",
              "Authentication approach",
              "Pagination for lists",
            ],
            follow_up_prep: "Expect: 'How would you handle sharing lists between users?' or 'What about recurring todos?' or 'How do you version this API?'",
          },
          difficulty: "medium" as const,
          tags: ["api-design", "rest", "system-design"],
        },
      ]
    : isPM
    ? [
        {
          id: "tech-metrics-001",
          question: "You're the PM for YouTube. How would you measure success for a new 'Shorts' feature?",
          interviewer_intent: `${company_name} is testing your product sense and metrics intuition. They're evaluating: Do you start with the goal, not the metric? Can you distinguish vanity metrics from real health indicators? Do you consider trade-offs (engagement vs. revenue, short-term vs. long-term)? The meta-skill here is thinking like a business owner, not a feature owner.`,
          good_answer_demonstrates: [
            "Goal-first thinking (not metric-first)",
            "Distinguishing leading vs. lagging indicators",
            "Trade-off awareness (engagement vs. revenue)",
            "Counter-metrics to prevent gaming",
            "Ecosystem thinking (impact on other products)",
          ],
          common_mistakes: [
            "Listing metrics without connecting to goals",
            "Only short-term engagement metrics",
            "Ignoring cannibalization of long-form video",
            "No counter-metrics to prevent gaming",
          ],
          answer_framework: {
            approach: "Goal -> North Star -> Leading indicators -> Counter-metrics -> Trade-offs",
            key_elements: [
              "Clarify the goal (engagement? creator acquisition? revenue?)",
              "Define North Star metric (e.g., weekly active creators posting Shorts)",
              "Leading indicators (views, completion rate)",
              "Counter-metrics (long-form watch time, creator burnout)",
              "Trade-offs and how to balance",
              "How you'd review these metrics",
            ],
            follow_up_prep: "Expect: 'What if Shorts cannibalizes long-form?' or 'How do you prioritize between creator and viewer metrics?' or 'Walk me through the dashboard you'd build.'",
          },
          difficulty: "medium" as const,
          tags: ["metrics", "product-sense", "prioritization"],
        },
        {
          id: "tech-estimation-002",
          question: "How would you estimate the market size for electric scooter rentals in San Francisco?",
          interviewer_intent: `This is a classic estimation question, but ${company_name} isn't looking for the right number. They're evaluating your structured thinking: Can you break a vague question into tractable pieces? Do you state assumptions explicitly? Can you sanity-check your answer? The red flag is random guessing without showing the math.`,
          good_answer_demonstrates: [
            "Structured decomposition",
            "Explicit assumption-stating",
            "Multiple estimation approaches",
            "Sanity-checking the result",
            "Confidence interval acknowledgment",
          ],
          common_mistakes: [
            "Random number without showing work",
            "Not stating assumptions",
            "Only one approach (no triangulation)",
            "Overconfidence in the final number",
          ],
          answer_framework: {
            approach: "Define scope -> Decompose -> Estimate components -> Triangulate -> Sanity check",
            key_elements: [
              "Clarify what we're estimating (revenue? trips? users?)",
              "Top-down: SF population -> target demo -> usage",
              "Bottom-up: scooters in fleet -> trips per scooter -> revenue",
              "State key assumptions (price per ride, rides per day)",
              "Sanity check against known data points",
              "Give a range, not a point estimate",
            ],
            follow_up_prep: "Expect: 'What's the biggest risk to this estimate?' or 'How would you test this before launching?' or 'What about seasonality?'",
          },
          difficulty: "medium" as const,
          tags: ["estimation", "market-sizing", "structured-thinking"],
        },
        {
          id: "tech-prioritize-003",
          question: "You have a backlog of 50 feature requests. How do you decide what to build next quarter?",
          interviewer_intent: `${company_name} is probing your prioritization framework. They're not looking for a specific framework (RICE, ICE, etc.) but for structured thinking. Can you balance impact vs. effort? Do you consider dependencies and technical debt? Do you involve stakeholders or just dictate? The best answers show a repeatable process, not just gut instinct.`,
          good_answer_demonstrates: [
            "Clear prioritization framework",
            "Impact vs. effort trade-offs",
            "Stakeholder input process",
            "Dependency and technical debt awareness",
            "Willingness to say no and explain why",
          ],
          common_mistakes: [
            "Pure gut feel with no framework",
            "Only considering customer requests (ignoring tech debt)",
            "No stakeholder alignment process",
            "Treating all features as independent",
          ],
          answer_framework: {
            approach: "Gather input -> Score systematically -> Stack rank -> Validate -> Communicate",
            key_elements: [
              "How you gather input (customers, data, stakeholders)",
              "Scoring framework (impact, effort, risk, strategic fit)",
              "How you handle dependencies",
              "Validation with engineering and design",
              "How you communicate what's NOT being built",
              "Quarterly re-evaluation process",
            ],
            follow_up_prep: "Expect: 'What if the CEO wants a feature that doesn't score well?' or 'How do you balance quick wins vs. big bets?' or 'Walk me through a real example.'",
          },
          difficulty: "hard" as const,
          tags: ["prioritization", "execution", "stakeholder-management"],
        },
        {
          id: "tech-product-004",
          question: "Design a feature for Instagram that helps users spend less time on the app.",
          interviewer_intent: `This is a 'product sense' question with a twist - it's potentially against business interests. ${company_name} is testing: Can you think beyond DAU/MAU? Do you understand long-term trust vs. short-term engagement? Can you find win-win solutions? The trap is either ignoring the business impact or being too cynical about why Instagram would do this.`,
          good_answer_demonstrates: [
            "Understanding the tension (user wellbeing vs. engagement)",
            "Long-term thinking (trust builds retention)",
            "Creative solution-finding",
            "User research instincts",
            "Metrics that capture both sides",
          ],
          common_mistakes: [
            "Ignoring the business impact entirely",
            "Being cynical ('Instagram would never do this')",
            "Too complex a solution for an MVP",
            "No consideration of how users would discover/use it",
          ],
          answer_framework: {
            approach: "Understand the why -> User research -> Ideate -> Prioritize -> Metrics",
            key_elements: [
              "Why Instagram might want this (trust, regulation, PR)",
              "User research to understand the problem",
              "3-5 feature ideas at different complexity levels",
              "Pick one and explain why",
              "How you'd measure success (beyond less time = good)",
              "Risks and how you'd mitigate",
            ],
            follow_up_prep: "Expect: 'How do you measure success here?' or 'What if it works too well and hurts engagement?' or 'How do you get buy-in from leadership?'",
          },
          difficulty: "hard" as const,
          tags: ["product-sense", "ethics", "strategy"],
        },
        {
          id: "tech-technical-005",
          question: "Walk me through how you would work with engineering to define the technical approach for a new feature.",
          interviewer_intent: `${company_name} is testing your technical fluency and collaboration style. They're not expecting you to code, but they want to see: Do you understand technical trade-offs? Can you have a productive conversation with engineers? Do you defer appropriately or try to dictate? The red flag is either 'I just tell them what to build' or 'I don't understand technical stuff.'`,
          good_answer_demonstrates: [
            "Technical fluency (not expertise)",
            "Collaborative approach with engineering",
            "Understanding of trade-offs (speed vs. quality)",
            "Appropriate deferral on technical decisions",
            "Ability to translate product needs to technical requirements",
          ],
          common_mistakes: [
            "Dictating technical solutions",
            "Complete deference ('I don't do technical')",
            "No consideration of technical debt",
            "Ignoring engineering input on scope",
          ],
          answer_framework: {
            approach: "Requirements -> Kickoff -> Options -> Trade-offs -> Decision -> Documentation",
            key_elements: [
              "Start with clear problem statement and success criteria",
              "Kickoff with engineering to understand constraints",
              "Request multiple technical options with trade-offs",
              "Discuss timeline, risk, and technical debt",
              "Make decision collaboratively",
              "Document for future reference",
            ],
            follow_up_prep: "Expect: 'What if engineering says your timeline is unrealistic?' or 'How do you handle disagreements on approach?' or 'Give me a real example.'",
          },
          difficulty: "medium" as const,
          tags: ["collaboration", "technical-fluency", "execution"],
        },
      ]
    : // Data Scientist
      [
        {
          id: "tech-statistics-001",
          question: "Explain the difference between Type I and Type II errors. When might you prioritize one over the other?",
          interviewer_intent: `${company_name} is testing both your statistical knowledge and your judgment. The textbook answer is easy - they're probing for business intuition. Can you give real-world examples? Do you understand the trade-off between false positives and false negatives? The best answers connect statistics to business impact, not just theory.`,
          good_answer_demonstrates: [
            "Clear understanding of Type I vs. Type II",
            "Real-world examples that resonate",
            "Business judgment about trade-offs",
            "Understanding of sample size implications",
            "Ability to explain to non-technical stakeholders",
          ],
          common_mistakes: [
            "Only textbook definition without examples",
            "No business context for trade-offs",
            "Confusing the two types",
            "Over-complicating the explanation",
          ],
          answer_framework: {
            approach: "Define -> Examples -> Trade-offs -> Business context",
            key_elements: [
              "Clear definition of both types",
              "Real-world example (spam filter, medical diagnosis)",
              "When to prioritize Type I (false positive) avoidance",
              "When to prioritize Type II (false negative) avoidance",
              "How sample size affects both",
              "How to explain to product managers",
            ],
            follow_up_prep: "Expect: 'How do you set alpha level for an experiment?' or 'What's the relationship to statistical power?' or 'Give me an example from a project.'",
          },
          difficulty: "easy" as const,
          tags: ["statistics", "hypothesis-testing", "fundamentals"],
        },
        {
          id: "tech-ml-002",
          question: "You've built a model with 99% accuracy on your test set. What concerns would you have before deploying it?",
          interviewer_intent: `This question is a trap for candidates who only look at accuracy. ${company_name} is testing: Do you understand class imbalance? Can you think about real-world deployment issues? Do you consider fairness and edge cases? The 99% number is suspicious and the best candidates immediately ask 'What's the base rate?'`,
          good_answer_demonstrates: [
            "Immediate concern about class imbalance",
            "Understanding of metrics beyond accuracy",
            "Awareness of train/test distribution shift",
            "Fairness and bias considerations",
            "Deployment and monitoring thinking",
          ],
          common_mistakes: [
            "Taking 99% accuracy at face value",
            "Only considering precision/recall as alternatives",
            "Ignoring fairness and bias concerns",
            "No mention of real-world distribution shift",
          ],
          answer_framework: {
            approach: "Question the metric -> Check for issues -> Evaluate for production",
            key_elements: [
              "What's the base rate? (Class imbalance check)",
              "Precision/recall/F1 for each class",
              "Train/test distribution comparison",
              "Fairness across subgroups",
              "Calibration of probabilities",
              "Monitoring plan post-deployment",
            ],
            follow_up_prep: "Expect: 'The positive class is 1% of data' or 'How would you handle it if fairness metrics fail?' or 'Walk me through your monitoring plan.'",
          },
          difficulty: "medium" as const,
          tags: ["machine-learning", "metrics", "deployment"],
        },
        {
          id: "tech-experiment-003",
          question: "Design an A/B test to determine if a new checkout flow increases conversion rate.",
          interviewer_intent: `${company_name} is probing your experimental design skills. They're watching for: Do you define success metrics before the experiment? Can you size the sample correctly? Do you consider confounders and novelty effects? The best answers show a rigorous process, not just 'split traffic 50/50 and check after a week.'`,
          good_answer_demonstrates: [
            "Hypothesis formation before testing",
            "Clear primary and secondary metrics",
            "Sample size calculation",
            "Randomization and validity considerations",
            "Novelty effect awareness",
          ],
          common_mistakes: [
            "No hypothesis formulation",
            "Skipping sample size calculation",
            "Ignoring novelty effects",
            "Only one metric (no guardrails)",
          ],
          answer_framework: {
            approach: "Hypothesis -> Metrics -> Sample size -> Randomization -> Analysis plan",
            key_elements: [
              "Clear hypothesis (not 'new is better')",
              "Primary metric (conversion rate)",
              "Secondary/guardrail metrics (cart value, returns)",
              "Sample size calculation with MDE",
              "Randomization strategy",
              "Analysis plan including how long to run",
            ],
            follow_up_prep: "Expect: 'What MDE would you use and why?' or 'How do you handle peeking?' or 'What if results are significant but practical impact is tiny?'",
          },
          difficulty: "medium" as const,
          tags: ["experimentation", "ab-testing", "statistics"],
        },
        {
          id: "tech-sql-004",
          question: "Write a SQL query to find users who have made purchases in consecutive months.",
          interviewer_intent: `This is a window functions question, but ${company_name} is testing more than syntax. Can you think through the logic before writing? Do you handle edge cases (first purchase, gaps)? Can you explain your approach clearly? The best candidates talk through their thinking and acknowledge when they'd want to verify with sample data.`,
          good_answer_demonstrates: [
            "Clear problem decomposition",
            "Window function understanding (LAG/LEAD)",
            "Edge case handling",
            "Ability to explain logic clearly",
            "Desire to test with sample data",
          ],
          common_mistakes: [
            "Jumping to code without planning",
            "Missing edge cases (first month, gaps)",
            "Overly complex solution when simple exists",
            "Not explaining the logic",
          ],
          answer_framework: {
            approach: "Understand -> Plan -> Write -> Verify -> Optimize",
            key_elements: [
              "Clarify: What counts as 'purchase'? Date precision?",
              "Plan: Need to compare each month to previous",
              "LAG function to get previous purchase month",
              "Filter where current - previous = 1 month",
              "Handle: What if multiple purchases in a month?",
              "Verify: Walk through with sample data",
            ],
            follow_up_prep: "Expect: 'What if we need 3+ consecutive months?' or 'How would you optimize for a large table?' or 'Find users with the longest streak.'",
          },
          difficulty: "medium" as const,
          tags: ["sql", "window-functions", "analytics"],
        },
        {
          id: "tech-business-005",
          question: "Revenue is down 10% month-over-month. How would you diagnose the cause?",
          interviewer_intent: `${company_name} is testing your analytical problem-solving, not just technical skills. Can you structure a complex diagnosis? Do you segment systematically? Do you distinguish correlation from causation? The best answers show a methodical approach and acknowledge that data analysis is iterative, not linear.`,
          good_answer_demonstrates: [
            "Structured diagnostic approach",
            "Segmentation instincts",
            "Correlation vs. causation awareness",
            "Blend of data and intuition",
            "Hypothesis-driven investigation",
          ],
          common_mistakes: [
            "Random data exploration without structure",
            "Not segmenting (geography, product, user type)",
            "Jumping to conclusions without validation",
            "Ignoring external factors (seasonality, market)",
          ],
          answer_framework: {
            approach: "Scope -> Segment -> Hypothesize -> Validate -> Recommend",
            key_elements: [
              "Confirm the 10% is real (data quality check)",
              "Segment: geography, product, user cohort",
              "Check external factors (seasonality, competitors)",
              "Form hypotheses based on data patterns",
              "Validate with deeper analysis",
              "Recommend action with confidence level",
            ],
            follow_up_prep: "Expect: 'It's concentrated in one region' or 'New user acquisition is fine but retention is down' or 'What would you recommend to leadership?'",
          },
          difficulty: "hard" as const,
          tags: ["analytics", "diagnosis", "business"],
        },
      ];

  return {
    category: "technical" as const,
    company_slug,
    role_slug,
    questions,
  };
}

function generateMockCulture(position: PositionInfo) {
  const { company_slug, company_name, role_slug, company_values } = position;

  return {
    category: "culture" as const,
    company_slug,
    role_slug,
    questions: [
      {
        id: "cult-ownership-001",
        question: "Tell me about a time you took on something outside your job description because it needed to be done.",
        interviewer_intent: `${company_name} values ownership beyond your immediate role. The interviewer is testing whether you default to 'not my job' or naturally expand scope when needed. They're also probing for how you handled the ambiguity - did you wait for permission or act first? Importantly, they're watching whether you resent the extra work in hindsight or frame it as valuable growth. Authentic ownership means wanting to do it, not just doing it.`,
        target_value: company_values[0] || "Ownership",
        good_answer_demonstrates: [
          "Proactive scope expansion",
          "Comfort with ambiguity",
          "Long-term thinking over short-term convenience",
          "Genuine enthusiasm for ownership (not resentment)",
          "Learning from stepping outside comfort zone",
        ],
        common_mistakes: [
          "Framing it as a burden you had to bear",
          "Taking on things to show off rather than because they mattered",
          "No clear impact or outcome from the extra work",
          "Implying you only do this when asked or incentivized",
        ],
        answer_framework: {
          authenticity_check: "Before answering, ask yourself: Would I do this again? If you genuinely wouldn't, pick a different example where you felt energized by the ownership.",
          key_elements: [
            "Why you noticed the gap (shows awareness)",
            "Why you chose to act vs. escalate (judgment)",
            "How you balanced this with your actual responsibilities",
            "The outcome and what you learned",
            "Whether you'd approach it differently now",
            "How it shaped your view of ownership",
          ],
          red_flags_to_avoid: [
            "Complaining about the situation or colleagues",
            "Implying you were forced into it",
            "No mention of the result or learning",
          ],
        },
        difficulty: "medium" as const,
        tags: ["ownership", "initiative", "scope"],
      },
      {
        id: "cult-learning-002",
        question: "Describe a time you received critical feedback. How did you respond?",
        interviewer_intent: `${company_name} cultures feedback heavily. The interviewer is assessing your growth mindset in action - not in theory. Can you hear hard truths without getting defensive? Do you actually change, or just nod and continue? They're also watching how you describe the feedback-giver - candidates who subtly discredit the source reveal an inability to learn from others.`,
        target_value: "Growth Mindset",
        good_answer_demonstrates: [
          "Non-defensive reception of feedback",
          "Specific behavior change as a result",
          "Gratitude toward the feedback-giver",
          "Self-awareness about blind spots",
          "Ongoing effort to seek feedback",
        ],
        common_mistakes: [
          "Subtly discrediting the feedback or source",
          "No actual change in behavior",
          "Framing it as 'they misunderstood me'",
          "Only accepting feedback you already agreed with",
        ],
        answer_framework: {
          authenticity_check: "Choose an example where the feedback genuinely stung at first - and you grew from it. Surface-level feedback doesn't reveal much about your growth capacity.",
          key_elements: [
            "The specific feedback (be concrete)",
            "Your initial reaction (be honest if it stung)",
            "How you processed it",
            "The concrete change you made",
            "Evidence the change stuck",
            "Your relationship with that person now",
          ],
          red_flags_to_avoid: [
            "Defensiveness about the feedback",
            "Making the feedback-giver look bad",
            "No concrete behavior change",
          ],
        },
        difficulty: "medium" as const,
        tags: ["growth-mindset", "feedback", "self-awareness"],
      },
      {
        id: "cult-customer-003",
        question: "Tell me about a time you advocated for the customer even when it was inconvenient for you or the team.",
        interviewer_intent: `${company_name} tests whether you genuinely put customers first or just say you do. The interviewer is looking for situations where customer focus created tension - with timeline, with a stakeholder, with your own priorities. They're testing: Do you cave under pressure, or find ways to serve the customer AND the business? The authentic version includes the cost you paid.`,
        target_value: "Customer Obsession",
        good_answer_demonstrates: [
          "Genuine customer empathy",
          "Willingness to have difficult conversations",
          "Creative problem-solving to serve customer AND business",
          "Personal cost acknowledged (not martyrdom)",
          "Long-term customer relationship thinking",
        ],
        common_mistakes: [
          "Story with no real tension or cost",
          "Ignoring legitimate business constraints",
          "Hero narrative without team acknowledgment",
          "Customer focus that actually hurt the customer long-term",
        ],
        answer_framework: {
          authenticity_check: "The best examples involve real tension - where the 'easy' path was to deprioritize the customer. If there was no cost, it's not really advocacy.",
          key_elements: [
            "The customer's situation and why it mattered",
            "The tension with business/team priorities",
            "How you advocated (specific actions)",
            "The cost to you or the team",
            "The outcome for the customer",
            "How you'd balance it differently now",
          ],
          red_flags_to_avoid: [
            "No real cost or tension in the story",
            "Ignoring that the business also matters",
            "Taking sole credit for a team effort",
          ],
        },
        difficulty: "hard" as const,
        tags: ["customer-obsession", "advocacy", "trade-offs"],
      },
      {
        id: "cult-speed-004",
        question: "Describe your ideal work environment. What kind of culture brings out your best work?",
        interviewer_intent: `This seems open-ended, but ${company_name} is probing for authentic fit. They're watching for: Does your described ideal actually match their culture? Are you self-aware about what you need? The risk is saying what you think they want to hear - experienced interviewers spot this. It's better to be honest about your preferences and let both sides assess fit.`,
        target_value: "Work Style Fit",
        good_answer_demonstrates: [
          "Genuine self-awareness about preferences",
          "Specific examples that illustrate the ideal",
          "Acknowledgment of trade-offs in any culture",
          "Flexibility where appropriate",
          "Honest assessment of where you struggle",
        ],
        common_mistakes: [
          "Saying what you think they want to hear",
          "Being too vague ('I like collaborative environments')",
          "No acknowledgment of trade-offs",
          "Pretending you thrive in all environments",
        ],
        answer_framework: {
          authenticity_check: "Be honest. If you discover a mismatch, it's better for both parties. A job where you can't be yourself is not a job worth having.",
          key_elements: [
            "Specific characteristics you thrive in (with examples)",
            "What you need from management/team",
            "Trade-offs you're willing to make",
            "Environments where you've struggled (honest)",
            "How you've adapted when culture didn't match",
            "Questions you have about their culture",
          ],
          red_flags_to_avoid: [
            "Generic answers that could apply anywhere",
            "Clearly saying what they want to hear",
            "No self-awareness about limitations",
          ],
        },
        difficulty: "easy" as const,
        tags: ["culture-fit", "self-awareness", "authenticity"],
      },
      {
        id: "cult-bias-005",
        question: "Tell me about a time you changed your mind on something you believed strongly.",
        interviewer_intent: `${company_name} values intellectual humility - the ability to update beliefs based on evidence. The interviewer is testing: Can you hold strong opinions loosely? Do you actually change, or just pretend to? They're watching for the quality of the new evidence and whether you sought it out or resisted it. Candidates who 'never had to change their mind' reveal either arrogance or lack of intellectual ambition.`,
        target_value: "Intellectual Humility",
        good_answer_demonstrates: [
          "Genuine belief change (not trivial)",
          "Evidence-based updating",
          "Willingness to admit you were wrong",
          "Active seeking of disconfirming evidence",
          "Humility without self-deprecation",
        ],
        common_mistakes: [
          "Choosing something trivial",
          "Framing it as 'I was partly right'",
          "No explanation of what convinced you",
          "Being defensive about the original belief",
        ],
        answer_framework: {
          authenticity_check: "Choose something you actually believed strongly - and were genuinely wrong about. The strength of the original conviction makes the change more impressive, not less.",
          key_elements: [
            "The original belief and why you held it",
            "What challenged it (person, evidence, experience)",
            "Your internal process of updating",
            "The new belief and how it's different",
            "How this changed your behavior",
            "What it taught you about your own biases",
          ],
          red_flags_to_avoid: [
            "Minimizing the original belief",
            "Blaming others for your original position",
            "No genuine change, just 'nuancing'",
          ],
        },
        difficulty: "medium" as const,
        tags: ["intellectual-humility", "growth", "open-mindedness"],
      },
    ],
  };
}

function generateMockCurveball(position: PositionInfo) {
  const { company_slug, company_name, role_slug } = position;

  return {
    category: "curveball" as const,
    company_slug,
    role_slug,
    questions: [
      {
        id: "curve-estimation-001",
        question: "How many golf balls fit in a school bus?",
        question_type: "estimation" as const,
        interviewer_intent: `The interviewer already knows any reasonable answer is fine - this is about process, not precision. ${company_name} is evaluating: Can you structure chaos? Do you state assumptions or pretend to know dimensions? Are you comfortable being wrong and adjusting? Senior interviewers specifically watch for whether you challenge the premise ('What size school bus?') vs. accepting it blindly and whether you stay curious rather than anxious.`,
        good_answer_demonstrates: [
          "Structured decomposition of a complex problem",
          "Explicit assumption-stating",
          "Comfort with back-of-envelope math",
          "Willingness to sanity-check and adjust",
          "Maintaining composure and even curiosity",
        ],
        common_mistakes: [
          "Freezing or saying 'I don't know'",
          "Guessing a random number without showing work",
          "Getting defensive when pushed on assumptions",
          "Over-engineering the calculation",
        ],
        answer_framework: {
          composure_tip: "Say: 'I'll estimate this step by step and state my assumptions as I go.' This signals you know what they're looking for and buys you thinking time.",
          approach: "Estimate container volume -> Estimate object volume -> Divide -> Sanity check",
          key_elements: [
            "Estimate bus dimensions (state as assumption)",
            "Calculate bus volume in cubic feet",
            "Estimate golf ball diameter and volume",
            "Account for packing efficiency (~60-70%)",
            "Do the division",
            "Sanity check: 'Does this feel reasonable?'",
          ],
        },
        difficulty: "medium" as const,
        tags: ["estimation", "structured-thinking", "composure"],
      },
      {
        id: "curve-pressure-002",
        question: "What's your biggest weakness, and don't give me a fake one.",
        question_type: "pressure" as const,
        interviewer_intent: `The interviewer is testing three things at once: 1) Self-awareness - can you identify a real limitation? 2) Honesty under pressure - will you give a genuine answer when pushed? 3) Growth mindset - do you frame weaknesses as fixed traits or areas of active work? They've explicitly closed the 'I work too hard' escape route at ${company_name}, so they're watching for authenticity and whether you can be vulnerable without self-sabotage.`,
        good_answer_demonstrates: [
          "Genuine self-awareness",
          "Honesty without self-sabotage",
          "Evidence of working on the weakness",
          "Maturity in discussing limitations",
          "Connecting weakness to role-relevant context",
        ],
        common_mistakes: [
          "Giving a humble-brag ('I'm a perfectionist')",
          "Naming something that's a dealbreaker for the role",
          "No evidence of growth or mitigation",
          "Getting defensive or flustered by the pressure",
        ],
        answer_framework: {
          composure_tip: "The pressure is deliberate - take a breath and remember that honest self-awareness is MORE impressive than a polished non-answer. Genuine vulnerability builds trust.",
          approach: "Name a real weakness -> Show you've identified it -> Describe mitigation -> Connect to growth",
          key_elements: [
            "A genuine weakness (not a disguised strength)",
            "Specific example of when it's shown up",
            "What you've done to work on it",
            "Honest acknowledgment of ongoing progress",
            "Why it won't derail you in this role",
            "What you're still learning about yourself",
          ],
        },
        difficulty: "hard" as const,
        tags: ["self-awareness", "honesty", "pressure"],
      },
      {
        id: "curve-hypothetical-003",
        question: "If you could have dinner with anyone, living or dead, who would it be and why?",
        question_type: "hypothetical" as const,
        interviewer_intent: `This question seems casual but ${company_name} uses it to reveal your values and intellectual curiosity. They're not judging the person you pick - they're evaluating WHY. Do you pick someone to impress (Einstein, Mandela) or someone genuinely meaningful to you? Can you articulate what you'd want to learn? The best answers reveal authentic curiosity and values, not what you think sounds impressive.`,
        good_answer_demonstrates: [
          "Authentic choice (not performative)",
          "Clear articulation of why this person",
          "Intellectual curiosity about their perspective",
          "What you'd want to learn or discuss",
          "Willingness to be personal if genuine",
        ],
        common_mistakes: [
          "Picking someone to sound impressive",
          "No genuine connection or reason",
          "Vague answer without depth",
          "Being unable to explain what you'd discuss",
        ],
        answer_framework: {
          composure_tip: "Don't overthink who sounds 'best.' Pick someone you're genuinely curious about, even if it's unexpected. Authenticity beats impressiveness every time.",
          approach: "Who -> Why them specifically -> What you'd discuss -> What you'd hope to learn",
          key_elements: [
            "Name someone specific",
            "Why this person (not surface-level reasons)",
            "What questions you'd ask them",
            "What you hope to learn or understand",
            "Connection to something meaningful in your life",
            "Willingness to go deep on your reasoning",
          ],
        },
        difficulty: "medium" as const,
        tags: ["creativity", "values", "intellectual-curiosity"],
      },
      {
        id: "curve-creative-004",
        question: "Design a product for blind people to use a smartphone more easily.",
        question_type: "creative" as const,
        interviewer_intent: `${company_name} is testing user empathy and structured creativity under time pressure. Can you quickly empathize with a user group you may not belong to? Do you ask clarifying questions or make assumptions? They're watching for: Do you consider existing solutions first? Can you identify the real problem before jumping to solutions? Bonus points for acknowledging what you don't know and how you'd learn.`,
        good_answer_demonstrates: [
          "User empathy for a different lived experience",
          "Research instinct (what already exists?)",
          "Problem definition before solution",
          "Structured ideation process",
          "Humility about limitations of your perspective",
        ],
        common_mistakes: [
          "Jumping to solutions without understanding the problem",
          "Ignoring existing accessibility features",
          "Assuming what blind users want without considering diversity",
          "Patronizing or overly complex solutions",
        ],
        answer_framework: {
          composure_tip: "Acknowledge upfront: 'I'm not an expert on accessibility. Let me think through this by first considering what I'd want to learn from actual users.'",
          approach: "Empathize -> Existing solutions -> Problem definition -> Ideate -> Select -> Acknowledge gaps",
          key_elements: [
            "Acknowledge your perspective limitation",
            "Consider what already exists (VoiceOver, TalkBack)",
            "Define a specific problem (not 'everything')",
            "Generate 2-3 ideas of varying complexity",
            "Pick one and explain trade-offs",
            "Describe how you'd validate with real users",
          ],
        },
        difficulty: "hard" as const,
        tags: ["creativity", "empathy", "product-design"],
      },
      {
        id: "curve-reflection-005",
        question: "What would your harshest critic say about you?",
        question_type: "self-reflection" as const,
        interviewer_intent: `${company_name} uses this to probe self-awareness at a deeper level than 'what's your weakness.' The 'harshest' framing invites you to be more honest. They're testing: Can you take an external perspective on yourself? Do you get defensive when imagining criticism? Can you acknowledge hard truths without spiraling into self-deprecation? The best answers show you've actually thought about this before.`,
        good_answer_demonstrates: [
          "Genuine external perspective-taking",
          "Specific criticism (not vague)",
          "Non-defensive acknowledgment",
          "Evidence of having processed this",
          "Balance between honesty and self-compassion",
        ],
        common_mistakes: [
          "Deflecting with humor",
          "Too vague ('they'd say I work too hard')",
          "Getting defensive about the criticism",
          "Self-deprecation spiral",
        ],
        answer_framework: {
          composure_tip: "The question asks what a critic would say, not whether they're right. You can acknowledge the criticism exists without fully agreeing. This shows nuance.",
          approach: "Identify the critic perspective -> State the criticism -> Acknowledge what's fair -> Add nuance -> Show growth",
          key_elements: [
            "Who this critic might be (type, not name)",
            "The specific criticism they'd voice",
            "What's fair about it",
            "What nuance you'd add",
            "How you've tried to address it",
            "What you're still working on",
          ],
        },
        difficulty: "hard" as const,
        tags: ["self-awareness", "criticism", "perspective"],
      },
    ],
  };
}

// ============================================================================
// Main Generation Function
// ============================================================================

async function generateQA(config: GenerationConfig) {
  const { company, role, type, dryRun, outputDir } = config;

  console.log(`\nGenerating Q&A for: ${company} - ${role}`);
  console.log(`Category: ${type}`);
  console.log(`Dry run: ${dryRun}\n`);

  // Get company and role info
  const companyInfo = COMPANY_INFO[company.toLowerCase()];
  const roleInfo = ROLE_INFO[role.toLowerCase()];

  if (!companyInfo) {
    console.error(`Company not found: ${company}`);
    console.error(`Available: ${Object.keys(COMPANY_INFO).join(", ")}`);
    process.exit(1);
  }

  if (!roleInfo) {
    console.error(`Role not found: ${role}`);
    console.error(`Available: ${Object.keys(ROLE_INFO).join(", ")}`);
    process.exit(1);
  }

  const position: PositionInfo = {
    company_slug: company.toLowerCase(),
    company_name: companyInfo.name,
    role_slug: role.toLowerCase(),
    role_name: roleInfo.name,
    company_values: companyInfo.values,
    role_competencies: roleInfo.competencies,
    tech_stack: roleInfo.tech_stack,
  };

  // Generate requested categories
  const categories: QACategory[] = type === "all" ? ["behavioral", "technical", "culture", "curveball"] : [type];

  const outputs: Record<string, unknown> = {};

  for (const category of categories) {
    console.log(`\nGenerating ${category} questions...`);

    let output;
    switch (category) {
      case "behavioral":
        output = generateMockBehavioral(position);
        break;
      case "technical":
        output = generateMockTechnical(position);
        break;
      case "culture":
        output = generateMockCulture(position);
        break;
      case "curveball":
        output = generateMockCurveball(position);
        break;
    }

    // Validate
    const result = validateQAOutput(output, category);
    if (result.valid) {
      console.log(`  ✓ ${category} valid (${(output as { questions: unknown[] }).questions.length} questions)`);
    } else {
      console.log(`  ✗ ${category} invalid:`);
      result.errors.forEach((e) => console.log(`    ${e}`));
      process.exit(1);
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => console.log(`    ⚠ ${w}`));
    }

    outputs[category] = output;
  }

  // Combine into single output
  const fullOutput = {
    company_slug: company.toLowerCase(),
    company_name: companyInfo.name,
    role_slug: role.toLowerCase(),
    role_name: roleInfo.name,
    generated_at: new Date().toISOString(),
    ...outputs,
  };

  if (dryRun) {
    console.log("\n--- DRY RUN OUTPUT ---");
    console.log(JSON.stringify(fullOutput, null, 2));
    console.log("\n--- END DRY RUN ---");
  } else {
    const outputPath = path.join(
      outputDir,
      `qa-${company.toLowerCase()}-${role.toLowerCase()}-${type === "all" ? "all" : type}.json`
    );
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(fullOutput, null, 2));
    console.log(`\nOutput saved to: ${outputPath}`);
  }

  return fullOutput;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const argMap: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key) {
        argMap[key] = value ?? "true";
      }
    }
  }

  const config: GenerationConfig = {
    company: argMap.company || "",
    role: argMap.role || "",
    type: (argMap.type as QACategory | "all") || "all",
    dryRun: "dry-run" in argMap,
    outputDir: argMap.output || "output",
  };

  if (!config.company || !config.role) {
    console.error("Usage:");
    console.error("  npm run generate-qa -- --company=google --role=swe --type=behavioral --dry-run");
    console.error("  npm run generate-qa -- --company=amazon --role=pm --type=all --output=output/");
    console.error("\nAvailable companies: google, amazon, meta");
    console.error("Available roles: swe, pm, ds");
    console.error("Available types: behavioral, technical, culture, curveball, all");
    process.exit(1);
  }

  await generateQA(config);
}

// Run when executed directly
const isMain = process.argv[1]?.includes("generate-qa");
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { generateQA };
export type { GenerationConfig, PositionInfo };
