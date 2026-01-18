/**
 * Tests for Q&A prompt output validation.
 */

import {
  validateQAOutput,
  checkTeachesThinking,
  checkRoleSpecific,
  checkCompanySpecific,
  BehavioralQAOutputSchema,
  TechnicalQAOutputSchema,
  CultureQAOutputSchema,
  CurveballQAOutputSchema,
} from "../qa-validation";

// ============================================================================
// Test Data Generators
// ============================================================================

function createValidBehavioralQuestion(overrides = {}) {
  return {
    id: "beh-leadership-001",
    question: "Tell me about a time you had to lead a project without formal authority.",
    interviewer_intent:
      "The interviewer is assessing your influence skills: can you get buy-in from peers? Do you lead through expertise and trust, or do you rely on hierarchy? They're watching HOW you describe the team.",
    good_answer_demonstrates: [
      "Influence without authority",
      "Stakeholder management",
      "Self-awareness about leadership style",
    ],
    common_mistakes: [
      "Taking all credit",
      "Focusing on the WHAT instead of the HOW",
      "Describing coercion as influence",
    ],
    answer_framework: {
      structure: "STAR with leadership lens",
      key_elements: [
        "Why you stepped up",
        "How you built alignment",
        "Specific tactics used",
        "The outcome",
      ],
      time_allocation: "Situation: 15%, Task: 10%, Action: 55%, Result: 20%",
    },
    difficulty: "medium" as const,
    tags: ["leadership", "influence"],
    ...overrides,
  };
}

function createValidTechnicalQuestion(overrides = {}) {
  return {
    id: "tech-algorithm-001",
    question: "Given an array of integers, find two numbers that sum to a target value.",
    interviewer_intent:
      "This is a classic problem, but they're not testing if you've memorized the solution. They're evaluating your problem-solving process: Do you clarify constraints first? Do you start brute force?",
    good_answer_demonstrates: [
      "Clarifying questions before coding",
      "Brute force to optimization progression",
      "Time/space complexity analysis",
    ],
    common_mistakes: [
      "Jumping to code without clarifying",
      "Only knowing the optimal solution",
      "Ignoring edge cases",
    ],
    answer_framework: {
      approach: "Clarify -> Brute force -> Optimize -> Code -> Test",
      key_elements: [
        "Clarify constraints",
        "Brute force O(n^2)",
        "Optimize with hash map",
        "Handle edge cases",
      ],
      follow_up_prep: "Expect: 'What if the array is sorted?'",
    },
    difficulty: "easy" as const,
    tags: ["algorithms", "arrays"],
    ...overrides,
  };
}

function createValidCultureQuestion(overrides = {}) {
  return {
    id: "cult-ownership-001",
    question: "Tell me about a time you took on something outside your job description.",
    interviewer_intent:
      "The company values ownership beyond your immediate role. The interviewer is testing whether you default to 'not my job' or naturally expand scope. They're probing how you handled ambiguity.",
    target_value: "Ownership",
    good_answer_demonstrates: [
      "Proactive scope expansion",
      "Comfort with ambiguity",
      "Long-term thinking",
    ],
    common_mistakes: [
      "Framing it as a burden",
      "Taking on things to show off",
      "No clear impact",
    ],
    answer_framework: {
      authenticity_check: "Ask yourself: Would I do this again?",
      key_elements: [
        "Why you noticed the gap",
        "Why you chose to act",
        "How you balanced responsibilities",
        "The outcome",
      ],
      red_flags_to_avoid: [
        "Complaining about the situation",
        "Implying you were forced",
      ],
    },
    difficulty: "medium" as const,
    tags: ["ownership", "initiative"],
    ...overrides,
  };
}

function createValidCurveballQuestion(overrides = {}) {
  return {
    id: "curve-estimation-001",
    question: "How many golf balls fit in a school bus?",
    question_type: "estimation" as const,
    interviewer_intent:
      "The interviewer knows any reasonable answer is fine - this is about process. They're evaluating: Can you structure chaos? Do you state assumptions or pretend certainty?",
    good_answer_demonstrates: [
      "Structured decomposition",
      "Explicit assumption-stating",
      "Comfort with back-of-envelope math",
    ],
    common_mistakes: [
      "Freezing or saying 'I don't know'",
      "Guessing without showing work",
      "Getting defensive when pushed",
    ],
    answer_framework: {
      composure_tip: "Say: 'I'll estimate step by step and state my assumptions.'",
      approach: "Estimate container -> Estimate object -> Divide -> Sanity check",
      key_elements: [
        "Estimate bus dimensions",
        "Calculate volume",
        "Account for packing efficiency",
        "Sanity check",
      ],
    },
    difficulty: "medium" as const,
    tags: ["estimation", "structured-thinking"],
    ...overrides,
  };
}

// ============================================================================
// Behavioral Q&A Tests
// ============================================================================

describe("Behavioral Q&A validation", () => {
  test("validates correct behavioral output", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({ id: "beh-leadership-001" }),
        createValidBehavioralQuestion({ id: "beh-conflict-002", question: "Tell me about a disagreement." }),
        createValidBehavioralQuestion({ id: "beh-failure-003", question: "Tell me about a failure." }),
        createValidBehavioralQuestion({ id: "beh-teamwork-004", question: "Describe working with a team." }),
        createValidBehavioralQuestion({ id: "beh-growth-005", question: "Describe personal growth." }),
      ],
    };

    const result = validateQAOutput(output, "behavioral");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("requires minimum 5 questions", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({ id: "beh-leadership-001" }),
        createValidBehavioralQuestion({ id: "beh-conflict-002" }),
        createValidBehavioralQuestion({ id: "beh-failure-003" }),
        createValidBehavioralQuestion({ id: "beh-teamwork-004" }),
      ],
    };

    const result = validateQAOutput(output, "behavioral");
    expect(result.valid).toBe(false);
    // Error message may be "too_small" or "questions" related
    expect(result.errors.some((e) => e.includes("questions") || e.includes("Array"))).toBe(true);
  });

  test("enforces ID format beh-{tag}-{number}", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({ id: "invalid-id" }),
        createValidBehavioralQuestion({ id: "beh-conflict-002" }),
        createValidBehavioralQuestion({ id: "beh-failure-003" }),
        createValidBehavioralQuestion({ id: "beh-teamwork-004" }),
        createValidBehavioralQuestion({ id: "beh-growth-005" }),
      ],
    };

    const result = validateQAOutput(output, "behavioral");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("ID must match format"))).toBe(true);
  });

  test("requires interviewer_intent minimum length", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({ id: "beh-leadership-001", interviewer_intent: "Too short" }),
        createValidBehavioralQuestion({ id: "beh-conflict-002" }),
        createValidBehavioralQuestion({ id: "beh-failure-003" }),
        createValidBehavioralQuestion({ id: "beh-teamwork-004" }),
        createValidBehavioralQuestion({ id: "beh-growth-005" }),
      ],
    };

    const result = validateQAOutput(output, "behavioral");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("interviewer_intent"))).toBe(true);
  });

  test("detects duplicate IDs", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({ id: "beh-leadership-001" }),
        createValidBehavioralQuestion({ id: "beh-leadership-001" }), // duplicate
        createValidBehavioralQuestion({ id: "beh-failure-003" }),
        createValidBehavioralQuestion({ id: "beh-teamwork-004" }),
        createValidBehavioralQuestion({ id: "beh-growth-005" }),
      ],
    };

    const result = validateQAOutput(output, "behavioral");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate IDs"))).toBe(true);
  });
});

// ============================================================================
// Technical Q&A Tests
// ============================================================================

describe("Technical Q&A validation", () => {
  test("validates correct technical output", () => {
    const output = {
      category: "technical",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidTechnicalQuestion({ id: "tech-algorithm-001" }),
        createValidTechnicalQuestion({ id: "tech-sysdesign-002", question: "Design a URL shortener." }),
        createValidTechnicalQuestion({ id: "tech-debug-003", question: "How would you debug this?" }),
        createValidTechnicalQuestion({ id: "tech-code-004", question: "Implement an LRU cache." }),
        createValidTechnicalQuestion({ id: "tech-api-005", question: "Design a REST API." }),
      ],
    };

    const result = validateQAOutput(output, "technical");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("enforces ID format tech-{topic}-{number}", () => {
    const output = {
      category: "technical",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidTechnicalQuestion({ id: "wrong-format-001" }),
        createValidTechnicalQuestion({ id: "tech-sysdesign-002" }),
        createValidTechnicalQuestion({ id: "tech-debug-003" }),
        createValidTechnicalQuestion({ id: "tech-code-004" }),
        createValidTechnicalQuestion({ id: "tech-api-005" }),
      ],
    };

    const result = validateQAOutput(output, "technical");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("ID must match format"))).toBe(true);
  });

  test("requires follow_up_prep in answer_framework", () => {
    const output = {
      category: "technical",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidTechnicalQuestion({
          id: "tech-algorithm-001",
          answer_framework: {
            approach: "Test",
            key_elements: ["a", "b", "c", "d"],
            // missing follow_up_prep
          },
        }),
        createValidTechnicalQuestion({ id: "tech-sysdesign-002" }),
        createValidTechnicalQuestion({ id: "tech-debug-003" }),
        createValidTechnicalQuestion({ id: "tech-code-004" }),
        createValidTechnicalQuestion({ id: "tech-api-005" }),
      ],
    };

    const result = validateQAOutput(output, "technical");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("follow_up_prep"))).toBe(true);
  });
});

// ============================================================================
// Culture Q&A Tests
// ============================================================================

describe("Culture Q&A validation", () => {
  test("validates correct culture output", () => {
    const output = {
      category: "culture",
      company_slug: "amazon",
      role_slug: "pm",
      questions: [
        createValidCultureQuestion({ id: "cult-ownership-001" }),
        createValidCultureQuestion({ id: "cult-learning-002", target_value: "Growth Mindset" }),
        createValidCultureQuestion({ id: "cult-customer-003", target_value: "Customer Obsession" }),
        createValidCultureQuestion({ id: "cult-speed-004", target_value: "Bias for Action" }),
        createValidCultureQuestion({ id: "cult-bias-005", target_value: "Intellectual Humility" }),
      ],
    };

    const result = validateQAOutput(output, "culture");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("requires target_value for each question", () => {
    const questionWithoutValue = createValidCultureQuestion({ id: "cult-ownership-001" });
    // @ts-expect-error - deliberately testing missing field
    delete questionWithoutValue.target_value;

    const output = {
      category: "culture",
      company_slug: "amazon",
      role_slug: "pm",
      questions: [
        questionWithoutValue,
        createValidCultureQuestion({ id: "cult-learning-002", target_value: "Growth" }),
        createValidCultureQuestion({ id: "cult-customer-003", target_value: "Customer" }),
        createValidCultureQuestion({ id: "cult-speed-004", target_value: "Speed" }),
        createValidCultureQuestion({ id: "cult-bias-005", target_value: "Bias" }),
      ],
    };

    const result = validateQAOutput(output, "culture");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("target_value"))).toBe(true);
  });

  test("requires authenticity_check in answer_framework", () => {
    const output = {
      category: "culture",
      company_slug: "amazon",
      role_slug: "pm",
      questions: [
        createValidCultureQuestion({
          id: "cult-ownership-001",
          answer_framework: {
            // missing authenticity_check
            key_elements: ["a", "b", "c", "d"],
            red_flags_to_avoid: ["x", "y"],
          },
        }),
        createValidCultureQuestion({ id: "cult-learning-002" }),
        createValidCultureQuestion({ id: "cult-customer-003" }),
        createValidCultureQuestion({ id: "cult-speed-004" }),
        createValidCultureQuestion({ id: "cult-bias-005" }),
      ],
    };

    const result = validateQAOutput(output, "culture");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("authenticity_check"))).toBe(true);
  });
});

// ============================================================================
// Curveball Q&A Tests
// ============================================================================

describe("Curveball Q&A validation", () => {
  test("validates correct curveball output", () => {
    const output = {
      category: "curveball",
      company_slug: "google",
      role_slug: "pm",
      questions: [
        createValidCurveballQuestion({ id: "curve-estimation-001" }),
        createValidCurveballQuestion({ id: "curve-pressure-002", question_type: "pressure" }),
        createValidCurveballQuestion({ id: "curve-hypothetical-003", question_type: "hypothetical" }),
        createValidCurveballQuestion({ id: "curve-creative-004", question_type: "creative" }),
      ],
    };

    const result = validateQAOutput(output, "curveball");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("enforces valid question_type enum", () => {
    const output = {
      category: "curveball",
      company_slug: "google",
      role_slug: "pm",
      questions: [
        createValidCurveballQuestion({ id: "curve-estimation-001", question_type: "invalid" }),
        createValidCurveballQuestion({ id: "curve-pressure-002" }),
        createValidCurveballQuestion({ id: "curve-hypothetical-003" }),
        createValidCurveballQuestion({ id: "curve-creative-004" }),
      ],
    };

    const result = validateQAOutput(output, "curveball");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("question_type"))).toBe(true);
  });

  test("only allows medium or hard difficulty", () => {
    const output = {
      category: "curveball",
      company_slug: "google",
      role_slug: "pm",
      questions: [
        createValidCurveballQuestion({ id: "curve-estimation-001", difficulty: "easy" }),
        createValidCurveballQuestion({ id: "curve-pressure-002" }),
        createValidCurveballQuestion({ id: "curve-hypothetical-003" }),
        createValidCurveballQuestion({ id: "curve-creative-004" }),
      ],
    };

    const result = validateQAOutput(output, "curveball");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("difficulty"))).toBe(true);
  });

  test("requires composure_tip in answer_framework", () => {
    const output = {
      category: "curveball",
      company_slug: "google",
      role_slug: "pm",
      questions: [
        createValidCurveballQuestion({
          id: "curve-estimation-001",
          answer_framework: {
            // missing composure_tip
            approach: "Test",
            key_elements: ["a", "b", "c", "d"],
          },
        }),
        createValidCurveballQuestion({ id: "curve-pressure-002" }),
        createValidCurveballQuestion({ id: "curve-hypothetical-003" }),
        createValidCurveballQuestion({ id: "curve-creative-004" }),
      ],
    };

    const result = validateQAOutput(output, "curveball");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("composure_tip"))).toBe(true);
  });
});

// ============================================================================
// Quality Check Tests
// ============================================================================

describe("Quality checks", () => {
  test("checkTeachesThinking returns true for framework-based content", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({
          id: "beh-leadership-001",
          answer_framework: {
            structure: "STAR framework",
            key_elements: ["Use the approach", "Follow the structure", "Apply key elements", "Review framework"],
            time_allocation: "Situation: 20%, Action: 50%, Result: 30%",
          },
        }),
      ],
    };

    expect(checkTeachesThinking(output)).toBe(true);
  });

  test("checkTeachesThinking returns false for scripted answers", () => {
    const output = {
      questions: [
        {
          answer_framework: {
            structure: "Say something like: 'I am a great leader'",
            key_elements: ["Respond with: 'I always succeed'"],
          },
        },
      ],
    };

    expect(checkTeachesThinking(output)).toBe(false);
  });

  test("checkRoleSpecific returns true when role matches", () => {
    const output = {
      role_slug: "swe",
      company_slug: "google",
    };

    expect(checkRoleSpecific(output, "swe")).toBe(true);
  });

  test("checkRoleSpecific returns false when role doesn't match", () => {
    const output = {
      role_slug: "pm",
      company_slug: "google",
    };

    expect(checkRoleSpecific(output, "swe")).toBe(false);
  });

  test("checkCompanySpecific returns true when company matches", () => {
    const output = {
      role_slug: "swe",
      company_slug: "google",
    };

    expect(checkCompanySpecific(output, "google")).toBe(true);
  });

  test("checkCompanySpecific returns false when company doesn't match", () => {
    const output = {
      role_slug: "swe",
      company_slug: "amazon",
    };

    expect(checkCompanySpecific(output, "google")).toBe(false);
  });
});

// ============================================================================
// AI Phrase Detection Tests
// ============================================================================

describe("AI phrase detection", () => {
  test("warns on AI-sounding phrases", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({
          id: "beh-leadership-001",
          interviewer_intent:
            "In conclusion, the interviewer wants to see if you can lead. Furthermore, they want to assess your communication skills and ability to work with others.",
        }),
        createValidBehavioralQuestion({ id: "beh-conflict-002" }),
        createValidBehavioralQuestion({ id: "beh-failure-003" }),
        createValidBehavioralQuestion({ id: "beh-teamwork-004" }),
        createValidBehavioralQuestion({ id: "beh-growth-005" }),
      ],
    };

    const result = validateQAOutput(output, "behavioral");
    expect(result.warnings.some((w) => w.includes("AI-sounding phrases"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("in conclusion"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("furthermore"))).toBe(true);
  });
});

// ============================================================================
// Schema Export Tests
// ============================================================================

describe("Schema exports", () => {
  test("BehavioralQAOutputSchema parses valid data", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({ id: "beh-leadership-001" }),
        createValidBehavioralQuestion({ id: "beh-conflict-002" }),
        createValidBehavioralQuestion({ id: "beh-failure-003" }),
        createValidBehavioralQuestion({ id: "beh-teamwork-004" }),
        createValidBehavioralQuestion({ id: "beh-growth-005" }),
      ],
    };

    expect(() => BehavioralQAOutputSchema.parse(output)).not.toThrow();
  });

  test("TechnicalQAOutputSchema parses valid data", () => {
    const output = {
      category: "technical",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidTechnicalQuestion({ id: "tech-algorithm-001" }),
        createValidTechnicalQuestion({ id: "tech-sysdesign-002" }),
        createValidTechnicalQuestion({ id: "tech-debug-003" }),
        createValidTechnicalQuestion({ id: "tech-code-004" }),
        createValidTechnicalQuestion({ id: "tech-api-005" }),
      ],
    };

    expect(() => TechnicalQAOutputSchema.parse(output)).not.toThrow();
  });

  test("CultureQAOutputSchema parses valid data", () => {
    const output = {
      category: "culture",
      company_slug: "amazon",
      role_slug: "pm",
      questions: [
        createValidCultureQuestion({ id: "cult-ownership-001" }),
        createValidCultureQuestion({ id: "cult-learning-002" }),
        createValidCultureQuestion({ id: "cult-customer-003" }),
        createValidCultureQuestion({ id: "cult-speed-004" }),
        createValidCultureQuestion({ id: "cult-bias-005" }),
      ],
    };

    expect(() => CultureQAOutputSchema.parse(output)).not.toThrow();
  });

  test("CurveballQAOutputSchema parses valid data", () => {
    const output = {
      category: "curveball",
      company_slug: "google",
      role_slug: "pm",
      questions: [
        createValidCurveballQuestion({ id: "curve-estimation-001" }),
        createValidCurveballQuestion({ id: "curve-pressure-002" }),
        createValidCurveballQuestion({ id: "curve-hypothetical-003" }),
        createValidCurveballQuestion({ id: "curve-creative-004" }),
      ],
    };

    expect(() => CurveballQAOutputSchema.parse(output)).not.toThrow();
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe("Edge cases", () => {
  test("handles unknown category gracefully", () => {
    const output = { category: "behavioral" };
    const result = validateQAOutput(output, "unknown" as any);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown Q&A category"))).toBe(true);
  });

  test("handles null input", () => {
    const result = validateQAOutput(null, "behavioral");
    expect(result.valid).toBe(false);
  });

  test("handles empty questions array", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [],
    };

    const result = validateQAOutput(output, "behavioral");
    expect(result.valid).toBe(false);
  });

  test("validates key_elements has 4-6 items", () => {
    const output = {
      category: "behavioral",
      company_slug: "google",
      role_slug: "swe",
      questions: [
        createValidBehavioralQuestion({
          id: "beh-leadership-001",
          answer_framework: {
            structure: "STAR",
            key_elements: ["Only one"], // too few
            time_allocation: "test",
          },
        }),
        createValidBehavioralQuestion({ id: "beh-conflict-002" }),
        createValidBehavioralQuestion({ id: "beh-failure-003" }),
        createValidBehavioralQuestion({ id: "beh-teamwork-004" }),
        createValidBehavioralQuestion({ id: "beh-growth-005" }),
      ],
    };

    const result = validateQAOutput(output, "behavioral");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("key_elements"))).toBe(true);
  });
});
