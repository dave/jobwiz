/**
 * Tests for Content Orchestration Script
 * Issue #30 - Content orchestration script
 *
 * These tests validate the orchestration function using the real file system.
 * In dry-run mode, no actual database operations occur.
 */

import {
  orchestrate,
  type OrchestrationConfig,
} from "../orchestrate";
import * as fs from "fs";
import * as path from "path";

// Set test environment to skip sleeps
(process.env as Record<string, string>).NODE_ENV = "test";

describe("Orchestration Script", () => {
  const completedFilePath = path.join(process.cwd(), ".orchestration-completed.json");
  let originalCompletedContent: string | null = null;

  beforeEach(() => {
    // Save original completion file if it exists
    if (fs.existsSync(completedFilePath)) {
      originalCompletedContent = fs.readFileSync(completedFilePath, "utf-8");
    }
    // Write empty completion record for clean test
    fs.writeFileSync(completedFilePath, JSON.stringify({ completedItems: [] }));
  });

  afterEach(() => {
    // Restore original completion file or delete test file
    if (originalCompletedContent) {
      fs.writeFileSync(completedFilePath, originalCompletedContent);
    } else {
      if (fs.existsSync(completedFilePath)) {
        fs.unlinkSync(completedFilePath);
      }
    }
  });

  describe("Configuration", () => {
    test("requires company or batch flag", async () => {
      const config: OrchestrationConfig = {
        company: "",
        roles: [],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(false);
    });

    test("accepts valid company configuration", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
    });

    test("rejects unknown company", async () => {
      const config: OrchestrationConfig = {
        company: "unknown-company",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Pipeline Steps", () => {
    test("runs all pipeline steps in order", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
    });

    test("generates company module content", async () => {
      const config: OrchestrationConfig = {
        company: "amazon",
        roles: [],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
    });

    test("generates Q&A content for role", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["pm"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
    });
  });

  describe("Skip Already-Generated", () => {
    test("skips already-completed items when skipExisting is true", async () => {
      // Pre-populate completion record
      const completedRecord = {
        completedItems: [
          {
            companySlug: "google",
            roleSlug: "swe",
            completedAt: "2026-01-18T10:00:00Z",
          },
        ],
      };
      fs.writeFileSync(completedFilePath, JSON.stringify(completedRecord));

      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(0);
    });

    test("processes items when skipExisting is false", async () => {
      // Pre-populate completion record
      const completedRecord = {
        completedItems: [
          {
            companySlug: "google",
            roleSlug: "swe",
            completedAt: "2026-01-18T10:00:00Z",
          },
        ],
      };
      fs.writeFileSync(completedFilePath, JSON.stringify(completedRecord));

      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: false, // Don't skip
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.skipped).toBe(0);
      expect(result.processed).toBe(1);
    });
  });

  describe("Dry-Run Mode", () => {
    test("dry-run does not write completion records", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);

      // Read completion record - should still be empty
      const content = JSON.parse(fs.readFileSync(completedFilePath, "utf-8")) as { completedItems: unknown[] };
      expect(content.completedItems.length).toBe(0);
    });
  });

  describe("Multiple Roles", () => {
    test("processes multiple roles for one company", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe", "pm"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
    });

    test("skips unknown roles with warning", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe", "unknown-role"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1); // Only SWE processed
    });
  });

  describe("Output Format", () => {
    test("returns correct result structure", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("processed");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("failed");

      expect(typeof result.success).toBe("boolean");
      expect(typeof result.processed).toBe("number");
      expect(typeof result.skipped).toBe("number");
      expect(typeof result.failed).toBe("number");
    });
  });

  describe("Different Companies", () => {
    test("processes google correctly", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });

    test("processes amazon correctly", async () => {
      const config: OrchestrationConfig = {
        company: "amazon",
        roles: ["pm"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });

    test("processes apple correctly", async () => {
      const config: OrchestrationConfig = {
        company: "apple",
        roles: ["ds"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });

    test("processes microsoft correctly", async () => {
      const config: OrchestrationConfig = {
        company: "microsoft",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });

    test("processes meta correctly", async () => {
      const config: OrchestrationConfig = {
        company: "meta",
        roles: ["pm"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Different Roles", () => {
    test("processes SWE role correctly", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });

    test("processes PM role correctly", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["pm"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });

    test("processes DS role correctly", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["ds"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });

    test("processes software-engineer slug correctly", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["software-engineer"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });

    test("processes product-manager slug correctly", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["product-manager"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Company Module Only", () => {
    test("generates company module without roles", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: [], // No roles
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "test-worker",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
    });
  });

  describe("Worker ID", () => {
    test("accepts worker ID for distributed processing", async () => {
      const config: OrchestrationConfig = {
        company: "google",
        roles: ["swe"],
        dryRun: true,
        batch: false,
        top: 100,
        verbose: false,
        maxRetries: 3,
        skipExisting: true,
        workerId: "worker-123",
      };

      const result = await orchestrate(config);
      expect(result.success).toBe(true);
    });
  });
});
