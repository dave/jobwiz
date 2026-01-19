/**
 * Carousel components for JobWiz
 * Provides state management and paywall for the conversation-based learning UI
 *
 * Note: CarouselContainer and most item components (ContentItem, QuizItem, ChecklistItem)
 * have been deprecated in favor of the conversational components in @/components/alex.
 * This module now primarily provides:
 * - CarouselProvider/useCarousel - State management for navigation and progress
 * - CarouselPaywall - Premium content gate
 * - MediaItem - Video/audio content display
 */

export { CarouselProvider, useCarousel } from "./CarouselContext";
export {
  CarouselPaywall,
  type CarouselPaywallProps,
  type CarouselPaywallTrackEvent,
} from "./CarouselPaywall";

// Item components for rendering content in the carousel
// Only MediaItem remains - other item components are deprecated
export { MediaItem, type MediaItemProps } from "./items";
