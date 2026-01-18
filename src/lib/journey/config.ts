/**
 * Journey configuration loading functions
 * Loads journey configs from JSON files or Supabase
 */

import type { JourneyConfig, JourneyStep, PaywallConfig } from "@/types";

/** Error thrown when journey config is not found */
export class JourneyConfigNotFoundError extends Error {
  constructor(companySlug: string, roleSlug: string) {
    super(`Journey config not found for ${companySlug}/${roleSlug}`);
    this.name = "JourneyConfigNotFoundError";
  }
}

/** Error thrown when journey config is invalid */
export class JourneyConfigValidationError extends Error {
  constructor(message: string) {
    super(`Invalid journey config: ${message}`);
    this.name = "JourneyConfigValidationError";
  }
}

/**
 * Validates a JourneyStep object
 */
function isValidStep(step: unknown): step is JourneyStep {
  if (typeof step !== "object" || step === null) return false;
  const s = step as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.type === "string" &&
    ["content", "video", "audio", "quiz", "checklist"].includes(
      s.type as string
    ) &&
    typeof s.moduleId === "string" &&
    typeof s.required === "boolean" &&
    (s.sectionId === undefined || typeof s.sectionId === "string") &&
    (s.estimatedMinutes === undefined || typeof s.estimatedMinutes === "number")
  );
}

/**
 * Validates a PaywallConfig object
 */
function isValidPaywallConfig(config: unknown): config is PaywallConfig {
  if (typeof config !== "object" || config === null) return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.position === "number" &&
    typeof c.value === "string" &&
    typeof c.variant === "string" &&
    ["hard", "soft", "teaser"].includes(c.variant as string)
  );
}

/**
 * Validates a JourneyConfig object
 */
export function validateJourneyConfig(config: unknown): config is JourneyConfig {
  if (typeof config !== "object" || config === null) return false;
  const c = config as Record<string, unknown>;

  // Check required fields
  if (
    typeof c.id !== "string" ||
    typeof c.companySlug !== "string" ||
    typeof c.roleSlug !== "string" ||
    !Array.isArray(c.steps)
  ) {
    return false;
  }

  // Validate all steps
  for (const step of c.steps) {
    if (!isValidStep(step)) {
      return false;
    }
  }

  // Validate paywall config if present
  if (c.paywallConfig !== undefined && !isValidPaywallConfig(c.paywallConfig)) {
    return false;
  }

  return true;
}

/**
 * Load a journey config from a JSON file
 *
 * @param companySlug - Company slug (e.g., "google")
 * @param roleSlug - Role slug (e.g., "software-engineer")
 * @returns The journey configuration
 * @throws JourneyConfigNotFoundError if config doesn't exist
 * @throws JourneyConfigValidationError if config is invalid
 */
export async function loadJourneyConfig(
  companySlug: string,
  roleSlug: string
): Promise<JourneyConfig> {
  // Construct the path for the journey config
  const filename = `${companySlug}-${roleSlug.replace(/-/g, "-")}.json`;

  try {
    // Dynamic import of JSON file
    // In production, this would be fetched from Supabase
    const config = await import(`./samples/${filename}`).then(
      (mod) => mod.default
    );

    if (!validateJourneyConfig(config)) {
      throw new JourneyConfigValidationError(
        `Config for ${companySlug}/${roleSlug} has invalid structure`
      );
    }

    return config;
  } catch (error) {
    if (error instanceof JourneyConfigValidationError) {
      throw error;
    }
    throw new JourneyConfigNotFoundError(companySlug, roleSlug);
  }
}

/**
 * Load a journey config from raw JSON data
 * Used for testing or when config is already loaded
 *
 * @param data - Raw JSON data
 * @returns Validated journey configuration
 * @throws JourneyConfigValidationError if data is invalid
 */
export function parseJourneyConfig(data: unknown): JourneyConfig {
  if (!validateJourneyConfig(data)) {
    throw new JourneyConfigValidationError("Invalid journey config structure");
  }
  return data;
}

/**
 * Calculate total estimated time for a journey
 *
 * @param config - Journey configuration
 * @returns Total estimated minutes
 */
export function calculateJourneyDuration(config: JourneyConfig): number {
  return config.steps.reduce(
    (total, step) => total + (step.estimatedMinutes ?? 0),
    0
  );
}

/**
 * Get the number of required steps in a journey
 *
 * @param config - Journey configuration
 * @returns Number of required steps
 */
export function countRequiredSteps(config: JourneyConfig): number {
  return config.steps.filter((step) => step.required).length;
}

/**
 * Get steps before and after the paywall
 *
 * @param config - Journey configuration
 * @returns Object with freeSteps and premiumSteps arrays
 */
export function splitStepsByPaywall(config: JourneyConfig): {
  freeSteps: JourneyStep[];
  premiumSteps: JourneyStep[];
} {
  if (!config.paywallConfig) {
    return { freeSteps: config.steps, premiumSteps: [] };
  }

  const position = config.paywallConfig.position;
  return {
    freeSteps: config.steps.slice(0, position),
    premiumSteps: config.steps.slice(position),
  };
}
