"use client";

/**
 * Journey Demo Page
 * Demonstrates the carousel-based journey UX
 *
 * Note: The old JourneyContainer and Timeline components are deprecated.
 * This demo now uses CarouselProvider and CarouselContainer.
 */

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CarouselProvider,
  CarouselContainer,
  ContentItem,
  QuizItem,
  useCarousel,
} from "@/components/carousel";
import type { CarouselItem } from "@/types/carousel";
import type { ContentBlock, QuizBlock } from "@/types/module";

// Demo content blocks for each step
const demoBlocks: ContentBlock[] = [
  {
    id: "welcome-header",
    type: "header",
    content: "Welcome to Your Interview Prep Journey",
    level: 1,
  },
  {
    id: "welcome-text",
    type: "text",
    content:
      "This demo shows the **Carousel** component in action. Swipe left or right, use the arrow buttons, or press **Enter** to advance. Press **Escape** to exit.",
  },
  {
    id: "welcome-tip",
    type: "tip",
    content:
      "Notice how each item takes the full screen - one item at a time, no distractions.",
  },
  {
    id: "company-header",
    type: "header",
    content: "Understanding the Company",
    level: 1,
  },
  {
    id: "company-text",
    type: "text",
    content:
      "The carousel format is perfect for **focused learning**. Each card presents one concept clearly, making it easy to absorb and remember.",
  },
  {
    id: "company-quote",
    type: "quote",
    content:
      "The best interview prep happens when you can focus on one thing at a time.",
    author: "Interview Coach",
  },
  {
    id: "quiz-1",
    type: "quiz",
    question: "What navigation method can you use in the carousel?",
    options: [
      { id: "a", text: "Swipe gestures", isCorrect: true },
      { id: "b", text: "Arrow buttons", isCorrect: true },
      { id: "c", text: "Keyboard shortcuts", isCorrect: true },
      { id: "d", text: "All of the above", isCorrect: true },
    ],
    explanation:
      "The carousel supports swipe gestures, arrow buttons, and keyboard navigation (Enter/Arrow keys to advance, Escape to exit).",
  },
  {
    id: "final-header",
    type: "header",
    content: "Final Step",
    level: 1,
  },
  {
    id: "final-text",
    type: "text",
    content:
      "This is the **last item**. Notice the button now says **Done** instead of **Next**. The carousel UX provides a clean, focused learning experience.",
  },
  {
    id: "final-warning",
    type: "warning",
    content:
      "Remember: The carousel is designed for mobile-first, one-item-at-a-time learning. Perfect for interview prep on the go!",
  },
];

// Convert demo blocks to carousel items
function createDemoItems(): CarouselItem[] {
  return demoBlocks.map((block, index) => ({
    id: block.id,
    type: block.type === "quiz" ? "quiz" : "content",
    content: block,
    moduleSlug: "demo-module",
    sectionTitle: `Demo Section ${Math.floor(index / 3) + 1}`,
    isPremium: false,
    order: index,
  }));
}

/**
 * Inner component that renders within CarouselProvider
 */
function DemoCarouselInner() {
  const router = useRouter();
  const { currentItem, markComplete, next, isLastItem } = useCarousel();

  // Handle exit
  const handleExit = useCallback(() => {
    router.push("/");
  }, [router]);

  // Handle item completion
  const handleItemComplete = useCallback(() => {
    if (currentItem) {
      markComplete(currentItem.id);
      if (!isLastItem) {
        next();
      }
    }
  }, [currentItem, markComplete, next, isLastItem]);

  // Render current item
  const renderCurrentItem = useCallback(() => {
    if (!currentItem) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
          No content available
        </div>
      );
    }

    const { type, content } = currentItem;

    // Handle quiz items
    if (type === "quiz" || content.type === "quiz") {
      return (
        <QuizItem block={content as QuizBlock} onComplete={handleItemComplete} />
      );
    }

    // Default to content items
    return <ContentItem block={content} onComplete={handleItemComplete} />;
  }, [currentItem, handleItemComplete]);

  return (
    <CarouselContainer onExit={handleExit}>
      {renderCurrentItem()}
    </CarouselContainer>
  );
}

export default function JourneyDemoPage() {
  const items = useMemo(() => createDemoItems(), []);

  return (
    <CarouselProvider
      options={{
        companySlug: "demo",
        roleSlug: "demo-role",
        items,
        paywallIndex: null,
        hasPremiumAccess: true,
      }}
    >
      <DemoCarouselInner />
    </CarouselProvider>
  );
}
