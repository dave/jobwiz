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
