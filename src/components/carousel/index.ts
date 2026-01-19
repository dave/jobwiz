/**
 * Carousel components for JobWiz
 * Swipeable carousel UI for content navigation
 */

export { CarouselProvider, useCarousel } from "./CarouselContext";
export { CarouselContainer } from "./CarouselContainer";
export {
  CarouselPaywall,
  type CarouselPaywallProps,
  type CarouselPaywallTrackEvent,
} from "./CarouselPaywall";

// Item components for rendering content in the carousel
export {
  ContentItem,
  QuizItem,
  MediaItem,
  type ContentItemProps,
  type QuizItemProps,
  type MediaItemProps,
} from "./items";
