/**
 * Journey UI type definitions for JobWiz
 * Defines the step-based progressive disclosure system
 */

/** Types of steps in a journey */
export type JourneyStepType =
  | "content" // General content (text, images)
  | "video" // Video content
  | "audio" // Audio content
  | "quiz" // Interactive quiz
  | "checklist"; // Checklist/action items

/** A single step in a journey */
export interface JourneyStep {
  id: string;
  title: string;
  /** Type of content this step contains */
  type: JourneyStepType;
  /** Module ID this step references */
  moduleId: string;
  /** Section ID within the module (optional - if omitted, shows entire module) */
  sectionId?: string;
  /** Whether this step must be completed before advancing */
  required: boolean;
  /** Estimated time to complete in minutes */
  estimatedMinutes?: number;
}

/** Paywall configuration within a journey */
export interface PaywallConfig {
  /** Position in steps array where paywall appears (0-indexed) */
  position: number;
  /** Value proposition text shown at paywall */
  value: string;
  /** Paywall variant for AB testing */
  variant: "hard" | "soft" | "teaser";
}

/** Complete journey configuration */
export interface JourneyConfig {
  id: string;
  /** Company slug this journey is for */
  companySlug: string;
  /** Role slug this journey is for */
  roleSlug: string;
  /** Ordered list of steps */
  steps: JourneyStep[];
  /** Optional paywall configuration */
  paywallConfig?: PaywallConfig;
}

/** State of a step in the journey */
export type StepStatus = "completed" | "current" | "upcoming" | "locked";

/** User's answer to an interactive element */
export interface JourneyAnswer {
  questionId: string;
  answer: unknown;
  timestamp: number;
}

/** Persisted journey state */
export interface JourneyState {
  journeyId: string;
  currentStepIndex: number;
  completedSteps: string[];
  answers: JourneyAnswer[];
  lastUpdated: number;
}

/** Actions available through useJourney hook */
export interface JourneyActions {
  /** Navigate to a specific step by index */
  goToStep: (index: number) => void;
  /** Advance to next step */
  nextStep: () => void;
  /** Go back to previous step */
  prevStep: () => void;
  /** Mark a step as complete */
  markComplete: (stepId: string) => void;
  /** Store an answer for an interactive element */
  setAnswer: (questionId: string, answer: unknown) => void;
}

/** Context value provided by JourneyProvider */
export interface JourneyContextValue extends JourneyActions {
  config: JourneyConfig;
  currentStepIndex: number;
  completedSteps: Set<string>;
  answers: Map<string, unknown>;
  /** Progress as a percentage (0-100) */
  progress: number;
  /** Whether user can advance to next step */
  canAdvance: boolean;
  /** Whether currently on first step */
  isFirstStep: boolean;
  /** Whether currently on last step */
  isLastStep: boolean;
  /** Current step object */
  currentStep: JourneyStep;
}
