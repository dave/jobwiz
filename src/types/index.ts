/**
 * Shared type definitions for JobWiz
 * Re-exports all types from individual type files
 */

// Module and content block types
export type {
  ModuleType,
  ContentBlockType,
  TextBlock,
  HeaderBlock,
  QuoteBlock,
  TipBlock,
  WarningBlock,
  VideoBlock,
  AudioBlock,
  ImageBlock,
  QuizOption,
  QuizBlock,
  ChecklistItem,
  ChecklistBlock,
  InfographicBlock,
  AnimationBlock,
  ContentBlock,
  ModuleSection,
  Module,
} from "./module";

// Position-related types
export type {
  Industry,
  RoleCategory,
  Company,
  Role,
  Position,
} from "./position";

// Journey UI types
export type {
  JourneyStepType,
  JourneyStep,
  PaywallConfig,
  JourneyConfig,
  StepStatus,
  JourneyAnswer,
  JourneyState,
  JourneyActions,
  JourneyContextValue,
} from "./journey";
