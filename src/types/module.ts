/**
 * Module and Content Block type definitions for JobWiz
 * Used for building interview prep courses from modular content
 */

/** Types of modules that can be assembled into a course */
export type ModuleType =
  | "universal" // Applies to all interviews
  | "industry" // Applies to all companies in an industry
  | "role" // Applies to all positions of a role type
  | "company" // Applies to all roles at a company
  | "company-role"; // Specific to exact company+role combo

/** Types of content blocks that can appear within modules */
export type ContentBlockType =
  | "text"
  | "header"
  | "quote"
  | "tip"
  | "warning"
  | "video"
  | "audio"
  | "image"
  | "quiz"
  | "checklist"
  | "infographic"
  | "animation";

/** Base properties shared by all content blocks */
interface ContentBlockBase {
  id: string;
  type: ContentBlockType;
}

/** Text block - renders markdown text */
export interface TextBlock extends ContentBlockBase {
  type: "text";
  content: string;
}

/** Header block - section heading */
export interface HeaderBlock extends ContentBlockBase {
  type: "header";
  content: string;
  level: 1 | 2 | 3;
}

/** Quote block - highlighted quote */
export interface QuoteBlock extends ContentBlockBase {
  type: "quote";
  content: string;
  author?: string;
}

/** Tip block - helpful tip with green styling */
export interface TipBlock extends ContentBlockBase {
  type: "tip";
  content: string;
}

/** Warning block - caution with yellow/red styling */
export interface WarningBlock extends ContentBlockBase {
  type: "warning";
  content: string;
}

/** Video block - embedded video player */
export interface VideoBlock extends ContentBlockBase {
  type: "video";
  url: string;
  title?: string;
  /** Duration in seconds */
  duration?: number;
}

/** Audio block - audio player with controls */
export interface AudioBlock extends ContentBlockBase {
  type: "audio";
  url: string;
  title?: string;
  /** Duration in seconds */
  duration?: number;
}

/** Image block - single image */
export interface ImageBlock extends ContentBlockBase {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
}

/** Quiz option for multiple choice questions */
export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

/** Quiz block - multiple choice question */
export interface QuizBlock extends ContentBlockBase {
  type: "quiz";
  question: string;
  options: QuizOption[];
  /** Allow multiple selections */
  multiSelect?: boolean;
  /** Explanation shown after answering */
  explanation?: string;
}

/** Checklist item */
export interface ChecklistItem {
  id: string;
  text: string;
  /** Whether this item must be checked to complete the block */
  required?: boolean;
}

/** Checklist block - checkable items with persistence */
export interface ChecklistBlock extends ContentBlockBase {
  type: "checklist";
  title?: string;
  items: ChecklistItem[];
}

/** Infographic block - image with zoom capability */
export interface InfographicBlock extends ContentBlockBase {
  type: "infographic";
  url: string;
  alt: string;
  caption?: string;
}

/** Animation block - Lottie animation */
export interface AnimationBlock extends ContentBlockBase {
  type: "animation";
  /** URL to Lottie JSON file */
  animationUrl: string;
  /** Whether to loop the animation */
  loop?: boolean;
  /** Whether to autoplay */
  autoplay?: boolean;
}

/** Discriminated union of all content block types */
export type ContentBlock =
  | TextBlock
  | HeaderBlock
  | QuoteBlock
  | TipBlock
  | WarningBlock
  | VideoBlock
  | AudioBlock
  | ImageBlock
  | QuizBlock
  | ChecklistBlock
  | InfographicBlock
  | AnimationBlock;

/** A section within a module containing multiple content blocks */
export interface ModuleSection {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

/** A complete module containing sections of content */
export interface Module {
  id: string;
  slug: string;
  type: ModuleType;
  title: string;
  description?: string;
  sections: ModuleSection[];
  /** Whether this module requires payment to access */
  isPremium: boolean;
  /** Order within its type group (lower = first) */
  order: number;
  /** For industry modules: which industry this applies to */
  industry?: string;
  /** For role modules: which role category this applies to */
  roleCategory?: string;
  /** For company modules: which company this applies to */
  companySlug?: string;
  /** For company-role modules: both company and role */
  roleSlug?: string;
}
