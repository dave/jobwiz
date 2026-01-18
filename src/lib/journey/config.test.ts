import {
  validateJourneyConfig,
  parseJourneyConfig,
  loadJourneyConfig,
  calculateJourneyDuration,
  countRequiredSteps,
  splitStepsByPaywall,
  JourneyConfigNotFoundError,
  JourneyConfigValidationError,
} from "./config";
import type { JourneyConfig, JourneyStep } from "@/types";

// Sample valid config for testing
import sampleConfig from "./samples/google-swe.json";

// Test data factory
function createStep(overrides: Partial<JourneyStep> = {}): JourneyStep {
  return {
    id: "test-step",
    title: "Test Step",
    type: "content",
    moduleId: "test-module",
    required: true,
    ...overrides,
  };
}

function createConfig(overrides: Partial<JourneyConfig> = {}): JourneyConfig {
  return {
    id: "test-journey",
    companySlug: "test-company",
    roleSlug: "test-role",
    steps: [createStep()],
    ...overrides,
  };
}

describe("validateJourneyConfig", () => {
  test("returns true for valid config", () => {
    const config = createConfig();
    expect(validateJourneyConfig(config)).toBe(true);
  });

  test("returns true for sample config from JSON file", () => {
    expect(validateJourneyConfig(sampleConfig)).toBe(true);
  });

  test("returns false for null", () => {
    expect(validateJourneyConfig(null)).toBe(false);
  });

  test("returns false for non-object", () => {
    expect(validateJourneyConfig("string")).toBe(false);
    expect(validateJourneyConfig(123)).toBe(false);
    expect(validateJourneyConfig([])).toBe(false);
  });

  test("returns false when missing required fields", () => {
    expect(validateJourneyConfig({ id: "test" })).toBe(false);
    expect(
      validateJourneyConfig({ id: "test", companySlug: "company" })
    ).toBe(false);
    expect(
      validateJourneyConfig({
        id: "test",
        companySlug: "company",
        roleSlug: "role",
      })
    ).toBe(false);
  });

  test("returns false when steps is not an array", () => {
    expect(
      validateJourneyConfig({
        id: "test",
        companySlug: "company",
        roleSlug: "role",
        steps: "not an array",
      })
    ).toBe(false);
  });

  test("returns false when step has invalid type", () => {
    const config = createConfig({
      steps: [{ ...createStep(), type: "invalid" as "content" }],
    });
    expect(validateJourneyConfig(config)).toBe(false);
  });

  test("returns false when step is missing required fields", () => {
    const config = createConfig({
      steps: [{ id: "step", title: "Step" } as JourneyStep],
    });
    expect(validateJourneyConfig(config)).toBe(false);
  });

  test("returns false when paywall config is invalid", () => {
    const config = {
      ...createConfig(),
      paywallConfig: { position: "not a number" },
    };
    expect(validateJourneyConfig(config)).toBe(false);
  });

  test("returns true when paywall config has valid variant", () => {
    for (const variant of ["hard", "soft", "teaser"] as const) {
      const config = createConfig({
        paywallConfig: {
          position: 2,
          value: "Test value",
          variant,
        },
      });
      expect(validateJourneyConfig(config)).toBe(true);
    }
  });

  test("returns false when paywall config has invalid variant", () => {
    const config = {
      ...createConfig(),
      paywallConfig: {
        position: 2,
        value: "Test value",
        variant: "invalid",
      },
    };
    expect(validateJourneyConfig(config)).toBe(false);
  });

  test("validates all step types", () => {
    const types = ["content", "video", "audio", "quiz", "checklist"] as const;
    for (const type of types) {
      const config = createConfig({
        steps: [createStep({ type })],
      });
      expect(validateJourneyConfig(config)).toBe(true);
    }
  });
});

describe("parseJourneyConfig", () => {
  test("returns valid config unchanged", () => {
    const config = createConfig();
    expect(parseJourneyConfig(config)).toEqual(config);
  });

  test("throws JourneyConfigValidationError for invalid config", () => {
    expect(() => parseJourneyConfig(null)).toThrow(JourneyConfigValidationError);
    expect(() => parseJourneyConfig({ id: "incomplete" })).toThrow(
      JourneyConfigValidationError
    );
  });
});

describe("loadJourneyConfig", () => {
  test("loads valid config from JSON file", async () => {
    const config = await loadJourneyConfig("google", "swe");
    expect(config.id).toBe("journey-google-swe");
    expect(config.companySlug).toBe("google");
    expect(config.roleSlug).toBe("software-engineer");
    expect(config.steps.length).toBeGreaterThan(0);
  });

  test("sample config conforms to type", async () => {
    const config = await loadJourneyConfig("google", "swe");
    expect(validateJourneyConfig(config)).toBe(true);
  });

  test("throws JourneyConfigNotFoundError for missing config", async () => {
    await expect(
      loadJourneyConfig("nonexistent", "company")
    ).rejects.toThrow(JourneyConfigNotFoundError);
  });

  test("handles missing config gracefully", async () => {
    try {
      await loadJourneyConfig("invalid", "path");
      fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(JourneyConfigNotFoundError);
    }
  });
});

describe("calculateJourneyDuration", () => {
  test("returns sum of estimatedMinutes", () => {
    const config = createConfig({
      steps: [
        createStep({ estimatedMinutes: 5 }),
        createStep({ estimatedMinutes: 10 }),
        createStep({ estimatedMinutes: 15 }),
      ],
    });
    expect(calculateJourneyDuration(config)).toBe(30);
  });

  test("handles missing estimatedMinutes", () => {
    const config = createConfig({
      steps: [
        createStep({ estimatedMinutes: 5 }),
        createStep({ estimatedMinutes: undefined }),
        createStep({ estimatedMinutes: 10 }),
      ],
    });
    expect(calculateJourneyDuration(config)).toBe(15);
  });

  test("returns 0 for empty steps", () => {
    const config = createConfig({ steps: [] });
    expect(calculateJourneyDuration(config)).toBe(0);
  });
});

describe("countRequiredSteps", () => {
  test("counts required steps correctly", () => {
    const config = createConfig({
      steps: [
        createStep({ required: true }),
        createStep({ required: false }),
        createStep({ required: true }),
      ],
    });
    expect(countRequiredSteps(config)).toBe(2);
  });

  test("returns 0 when no required steps", () => {
    const config = createConfig({
      steps: [
        createStep({ required: false }),
        createStep({ required: false }),
      ],
    });
    expect(countRequiredSteps(config)).toBe(0);
  });

  test("returns 0 for empty steps", () => {
    const config = createConfig({ steps: [] });
    expect(countRequiredSteps(config)).toBe(0);
  });
});

describe("splitStepsByPaywall", () => {
  test("splits steps at paywall position", () => {
    const config = createConfig({
      steps: [
        createStep({ id: "step-1" }),
        createStep({ id: "step-2" }),
        createStep({ id: "step-3" }),
        createStep({ id: "step-4" }),
      ],
      paywallConfig: {
        position: 2,
        value: "Unlock premium",
        variant: "soft",
      },
    });

    const { freeSteps, premiumSteps } = splitStepsByPaywall(config);
    expect(freeSteps.map((s) => s.id)).toEqual(["step-1", "step-2"]);
    expect(premiumSteps.map((s) => s.id)).toEqual(["step-3", "step-4"]);
  });

  test("returns all steps as free when no paywall", () => {
    const config = createConfig({
      steps: [
        createStep({ id: "step-1" }),
        createStep({ id: "step-2" }),
      ],
    });

    const { freeSteps, premiumSteps } = splitStepsByPaywall(config);
    expect(freeSteps.length).toBe(2);
    expect(premiumSteps.length).toBe(0);
  });

  test("handles paywall at position 0", () => {
    const config = createConfig({
      steps: [
        createStep({ id: "step-1" }),
        createStep({ id: "step-2" }),
      ],
      paywallConfig: {
        position: 0,
        value: "Premium only",
        variant: "hard",
      },
    });

    const { freeSteps, premiumSteps } = splitStepsByPaywall(config);
    expect(freeSteps.length).toBe(0);
    expect(premiumSteps.length).toBe(2);
  });

  test("handles paywall at end", () => {
    const config = createConfig({
      steps: [
        createStep({ id: "step-1" }),
        createStep({ id: "step-2" }),
      ],
      paywallConfig: {
        position: 2,
        value: "All free",
        variant: "teaser",
      },
    });

    const { freeSteps, premiumSteps } = splitStepsByPaywall(config);
    expect(freeSteps.length).toBe(2);
    expect(premiumSteps.length).toBe(0);
  });
});
