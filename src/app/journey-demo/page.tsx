"use client";

/**
 * Journey Demo Page
 * Demonstrates the conversation-based journey UX (Lemonade-style)
 *
 * Updated from old carousel to new conversation UI components.
 */

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CarouselProvider, CarouselPaywall, useCarousel } from "@/components/carousel";
import {
  ConversationContainer,
  ConversationalQuiz,
  ConversationalContent,
} from "@/components/alex";
import type { CarouselItem } from "@/types/carousel";
import type { ContentBlock, QuizBlock, TextBlock, TipBlock, WarningBlock, QuoteBlock, HeaderBlock } from "@/types/module";

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
      "This demo shows the **Conversation** component in action. It's a Lemonade-style conversational experience. Press **Enter** to advance or use the navigation buttons.",
  },
  {
    id: "welcome-tip",
    type: "tip",
    content:
      "Notice how each item is presented in a focused, conversational format - one item at a time, no distractions.",
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
      "The conversation format is perfect for **focused learning**. Each card presents one concept clearly, making it easy to absorb and remember.",
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
    question: "What navigation method can you use in the conversation UI?",
    options: [
      { id: "a", text: "Navigation buttons", isCorrect: true },
      { id: "b", text: "Keyboard shortcuts", isCorrect: true },
      { id: "c", text: "Swipe gestures", isCorrect: true },
      { id: "d", text: "All of the above", isCorrect: true },
    ],
    explanation:
      "The conversation UI supports navigation buttons, keyboard shortcuts (Enter/Arrow keys to advance, Escape to exit), and touch gestures.",
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
      "This is the **last item**. Notice the button now says **Done** instead of **Next**. The conversation UX provides a clean, focused learning experience.",
  },
  {
    id: "final-warning",
    type: "warning",
    content:
      "Remember: The conversation UI is designed for mobile-first, one-item-at-a-time learning. Perfect for interview prep on the go!",
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
function DemoConversationInner() {
  const router = useRouter();
  const { currentItem, markComplete, next, isLastItem, isAtPaywall } = useCarousel();

  // Handle exit
  const handleExit = useCallback(() => {
    router.push("/");
  }, [router]);

  // Handle item completion
  const handleItemComplete = useCallback(() => {
    if (currentItem) {
      markComplete(currentItem.id);
      if (!isLastItem && !isAtPaywall) {
        next();
      }
    }
  }, [currentItem, markComplete, next, isLastItem, isAtPaywall]);

  // Render current item
  const renderCurrentItem = useCallback(() => {
    if (!currentItem) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
          No content available
        </div>
      );
    }

    const { id, type, content } = currentItem;

    // Handle paywall items
    if (type === "paywall") {
      return (
        <CarouselPaywall
          price={199}
          heading="Unlock Premium Content"
          description="Get full access to interview preparation content."
          mockMode={true}
        />
      );
    }

    // Handle quiz items - use ConversationalQuiz
    if (type === "quiz" || content.type === "quiz") {
      return (
        <ConversationalQuiz
          itemId={id}
          quiz={content as QuizBlock}
          onComplete={handleItemComplete}
        />
      );
    }

    // Handle header blocks - display as big centered text
    if (content.type === "header") {
      const headerBlock = content as HeaderBlock;
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {headerBlock.content}
          </h1>
        </div>
      );
    }

    // Handle text-based content (text, quote, tip, warning) - use ConversationalContent
    if (
      content.type === "text" ||
      content.type === "quote" ||
      content.type === "tip" ||
      content.type === "warning"
    ) {
      return (
        <ConversationalContent
          itemId={id}
          content={content as TextBlock | QuoteBlock | TipBlock | WarningBlock}
          onComplete={handleItemComplete}
        />
      );
    }

    // Default fallback for unknown content types
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
        Unsupported content type: {content.type}
      </div>
    );
  }, [currentItem, handleItemComplete]);

  return (
    <ConversationContainer onExit={handleExit}>
      {renderCurrentItem()}
    </ConversationContainer>
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
      <DemoConversationInner />
    </CarouselProvider>
  );
}
