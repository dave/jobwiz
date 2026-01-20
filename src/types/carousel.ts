/**
 * Carousel UI type definitions for JobWiz
 * Defines the swipeable carousel content system
 */

import type { ContentBlock } from "./module";

/** Type of item in the carousel */
export type CarouselItemType =
  | "content" // Regular content block
  | "quiz" // Quiz question
  | "checklist" // Checklist items
  | "paywall"; // Paywall gate

/** A single item in the carousel */
export interface CarouselItem {
  /** Unique identifier for this item */
  id: string;
  /** Type of carousel item */
  type: CarouselItemType;
  /** The actual content block data */
  content: ContentBlock;
  /** Slug of the module this item comes from */
  moduleSlug: string;
  /** Whether this item requires premium access */
  isPremium: boolean;
  /** Section title this item belongs to (for progress display) */
  sectionTitle?: string;
  /** Order within the carousel (0-indexed) */
  order: number;
}

/** Navigation direction for carousel */
export type CarouselDirection = "next" | "prev";

/** Current state of the carousel */
export interface CarouselState {
  /** Currently displayed item index */
  currentIndex: number;
  /** All items in the carousel */
  items: CarouselItem[];
  /** Whether auto-advance is paused (e.g., during video/audio playback) */
  isPaused: boolean;
  /** Index where paywall appears (null if no paywall) */
  paywallIndex: number | null;
  /** Whether the user has premium access */
  hasPremiumAccess: boolean;
  /** Set of completed item IDs */
  completedItems: Set<string>;
  /** Direction of last navigation (for animation) */
  lastDirection: CarouselDirection | null;
}

/** Actions available through useCarousel hook */
export interface CarouselNavigation {
  /** Navigate to next item */
  next: () => void;
  /** Navigate to previous item */
  prev: () => void;
  /** Navigate to specific item by index */
  goTo: (index: number) => void;
  /** Pause auto-advance (e.g., during media playback) */
  pause: () => void;
  /** Resume auto-advance */
  resume: () => void;
  /** Mark current item as complete */
  markComplete: (itemId: string) => void;
  /** Unlock paywall and advance to next item */
  unlockPaywall: () => void;
  /** Check if can navigate to next */
  canGoNext: boolean;
  /** Check if can navigate to previous */
  canGoPrev: boolean;
}

/** Context value provided by CarouselProvider */
export interface CarouselContextValue extends CarouselNavigation {
  /** Current carousel state */
  state: CarouselState;
  /** Currently displayed item */
  currentItem: CarouselItem | null;
  /** Progress as a percentage (0-100) */
  progress: number;
  /** Total number of items */
  totalItems: number;
  /** Number of completed items */
  completedCount: number;
  /** Whether currently on first item */
  isFirstItem: boolean;
  /** Whether currently on last item */
  isLastItem: boolean;
  /** Whether currently at paywall */
  isAtPaywall: boolean;
  /** Company slug for this carousel */
  companySlug: string;
  /** Role slug for this carousel */
  roleSlug: string;
  /** Save progress immediately (before navigation). Optional itemId adds an item just marked complete. */
  saveProgressNow: (itemIdToInclude?: string) => void;
}

/** Options for initializing a carousel */
export interface CarouselOptions {
  /** Company slug */
  companySlug: string;
  /** Role slug */
  roleSlug: string;
  /** Items to display in the carousel */
  items: CarouselItem[];
  /** Index where paywall appears (null for no paywall) */
  paywallIndex?: number | null;
  /** Whether user has premium access */
  hasPremiumAccess?: boolean;
  /** Initial index to start at */
  initialIndex?: number;
  /** Initial set of completed item IDs */
  initialCompletedItems?: string[];
}

/** Persisted carousel progress state */
export interface CarouselProgress {
  /** Company slug */
  companySlug: string;
  /** Role slug */
  roleSlug: string;
  /** Last viewed item index */
  currentIndex: number;
  /** IDs of completed items */
  completedItems: string[];
  /** Last updated timestamp */
  lastUpdated: number;
}

/** Display mode for conversation UI */
export type ConversationDisplayMode = "big-question" | "conversational";

/** Answer to a quiz question in conversation */
export interface ConversationAnswer {
  /** IDs of selected answer options */
  selectedIds: string[];
  /** Whether the answer was correct (for quizzes) */
  isCorrect?: boolean;
  /** When the answer was submitted */
  timestamp: number;
}

/** A message in the conversation */
export interface ConversationMessage {
  /** Unique message identifier */
  id: string;
  /** Who sent the message */
  sender: "alex" | "user";
  /** The message content (text or JSX) */
  content: string;
  /** ID of the carousel item this message relates to */
  itemId: string;
  /** When the message was sent */
  timestamp: number;
}

/** State for conversation context */
export interface ConversationState {
  /** All messages in the conversation */
  messages: ConversationMessage[];
  /** User answers keyed by item ID */
  answers: Record<string, ConversationAnswer>;
  /** Current display mode */
  displayMode: ConversationDisplayMode;
}

/** Actions available through useConversation hook */
export interface ConversationActions {
  /** Add a message to the conversation */
  addMessage: (
    sender: "alex" | "user",
    content: string,
    itemId: string
  ) => string;
  /** Record an answer for an item */
  recordAnswer: (
    itemId: string,
    selectedIds: string[],
    isCorrect?: boolean
  ) => void;
  /** Set display mode */
  setDisplayMode: (mode: ConversationDisplayMode) => void;
  /** Clear all messages (for reset) */
  clearMessages: () => void;
  /** Get answer for a specific item */
  getAnswer: (itemId: string) => ConversationAnswer | undefined;
  /** Check if item has been answered */
  hasAnswer: (itemId: string) => boolean;
}

/** Context value provided by ConversationProvider */
export interface ConversationContextValue
  extends ConversationState,
    ConversationActions {}
