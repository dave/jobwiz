"use client";

/**
 * Conversation Mode Demo - Quick Prototype
 * Demonstrates the conversational UI flow with Alex the coach
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CarouselProvider, useCarousel } from "@/components/carousel";
import {
  ConversationProvider,
  useConversation,
  ConversationalMode,
  ConversationalContent,
  ConversationalQuiz,
  SectionTimeline,
} from "@/components/alex";
import type { CarouselItem } from "@/types/carousel";
import type {
  ContentBlock,
  QuizBlock,
  TextBlock,
  QuoteBlock,
  TipBlock,
  WarningBlock,
} from "@/types/module";

// Demo content for the conversation
const demoContent: ContentBlock[] = [
  {
    id: "intro-text",
    type: "text",
    content:
      "Hey! I'm Alex, your interview coach. I'll be guiding you through your Google PM interview prep today.",
  },
  {
    id: "intro-tip",
    type: "tip",
    content:
      "This conversational format lets you learn at your own pace. Tap Continue when you're ready to move on.",
  },
  {
    id: "company-intro",
    type: "text",
    content:
      "Let's start by understanding what Google really looks for in Product Managers. It's not just about the frameworks you know...",
  },
  {
    id: "company-quote",
    type: "quote",
    content:
      "We don't just hire for skills. We hire for how you think, collaborate, and drive impact.",
    author: "Google Hiring Manager",
  },
  {
    id: "quiz-1",
    type: "quiz",
    question:
      "What do you think Google values MOST in PM candidates?",
    options: [
      { id: "a", text: "Technical depth in coding", isCorrect: false },
      { id: "b", text: "User empathy and product intuition", isCorrect: true },
      { id: "c", text: "MBA from top school", isCorrect: false },
      { id: "d", text: "Years of experience", isCorrect: false },
    ],
    explanation:
      "Google looks for user empathy and product intuition above all. They want PMs who can identify user needs and translate them into impactful products.",
  },
  {
    id: "values-text",
    type: "text",
    content:
      "Great insight! Now let's talk about Google's core values and how they show up in interviews.",
  },
  {
    id: "values-warning",
    type: "warning",
    content:
      "Many candidates focus too much on frameworks like CIRCLES or RICE. Google interviewers can spot rehearsed answers instantly.",
  },
  {
    id: "quiz-2",
    type: "quiz",
    question: "During a product design interview, what should you do FIRST?",
    options: [
      { id: "a", text: "Jump into brainstorming features", isCorrect: false },
      {
        id: "b",
        text: "Ask clarifying questions about the user",
        isCorrect: true,
      },
      { id: "c", text: "Draw a competitive analysis", isCorrect: false },
      { id: "d", text: "Define success metrics", isCorrect: false },
    ],
    explanation:
      "Always start by asking clarifying questions! Understanding the user and their problems is foundational. Google wants to see you think user-first.",
  },
  {
    id: "closing-text",
    type: "text",
    content:
      "You're doing great! This conversational approach helps you absorb information naturally, just like learning from a mentor.",
  },
  {
    id: "closing-tip",
    type: "tip",
    content:
      "In the full course, we'll cover all 5 interview types: Product Design, Strategy, Estimation, Technical, and Behavioral.",
  },
];

// Convert content to carousel items
function createDemoItems(): CarouselItem[] {
  return demoContent.map((block, index) => ({
    id: block.id,
    type: block.type === "quiz" ? "quiz" : "content",
    content: block,
    moduleSlug: "google-pm-intro",
    sectionTitle:
      index < 2
        ? "Welcome"
        : index < 5
          ? "What Google Looks For"
          : index < 8
            ? "Interview Strategy"
            : "Next Steps",
    isPremium: false,
    order: index,
  }));
}

/**
 * Main conversation flow orchestrator
 */
function ConversationFlow() {
  const router = useRouter();
  const { state, currentItem, next, isLastItem, markComplete } = useCarousel();
  const { messages } = useConversation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Handle item completion and advance
  const handleItemComplete = useCallback(() => {
    if (currentItem) {
      markComplete(currentItem.id);
      if (!isLastItem) {
        next();
      }
    }
  }, [currentItem, markComplete, next, isLastItem]);

  // Handle exit
  const handleExit = useCallback(() => {
    router.push("/");
  }, [router]);

  // Handle timeline section click
  const handleSectionClick = useCallback(
    (sectionIndex: number) => {
      // Find first item of section and navigate to it
      const items = state.items;
      let currentSection = -1;
      for (let i = 0; i < items.length; i++) {
        if (
          i === 0 ||
          items[i].sectionTitle !== items[i - 1].sectionTitle
        ) {
          currentSection++;
        }
        if (currentSection === sectionIndex) {
          // Navigate to this index
          // For now, just close sidebar
          setSidebarOpen(false);
          return;
        }
      }
    },
    [state.items]
  );

  // Render current content
  const renderCurrentContent = () => {
    if (!currentItem) {
      return (
        <div style={emptyStateStyle}>
          <p>No content to display</p>
          <button onClick={handleExit} style={exitButtonStyle}>
            Go Home
          </button>
        </div>
      );
    }

    const { content } = currentItem;

    // Quiz content
    if (content.type === "quiz") {
      return (
        <ConversationalQuiz
          itemId={currentItem.id}
          quiz={content as QuizBlock}
          onComplete={handleItemComplete}
        />
      );
    }

    // Text-based content (text, quote, tip, warning)
    if (["text", "quote", "tip", "warning"].includes(content.type)) {
      return (
        <ConversationalContent
          itemId={currentItem.id}
          content={content as TextBlock | QuoteBlock | TipBlock | WarningBlock}
          onComplete={handleItemComplete}
        />
      );
    }

    // Fallback
    return (
      <div style={emptyStateStyle}>
        <p>Unknown content type: {content.type}</p>
      </div>
    );
  };

  return (
    <div style={pageContainerStyle}>
      {/* Timeline sidebar */}
      <SectionTimeline
        items={state.items}
        currentIndex={state.currentIndex}
        completedItems={state.completedItems}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSectionClick={handleSectionClick}
      />

      {/* Main conversation area */}
      <div style={mainAreaStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={menuButtonStyle}
            aria-label="Open progress menu"
          >
            ☰
          </button>
          <span style={headerTitleStyle}>Google PM Interview Prep</span>
          <button
            onClick={handleExit}
            style={closeButtonStyle}
            aria-label="Exit"
          >
            ✕
          </button>
        </header>

        {/* Conversation view */}
        <ConversationalMode messages={messages}>
          {renderCurrentContent()}
        </ConversationalMode>

        {/* Progress indicator */}
        <div style={progressBarContainerStyle}>
          <div
            style={{
              ...progressBarFillStyle,
              width: `${((state.currentIndex + 1) / state.items.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Demo page with providers
 */
export default function ConversationDemoPage() {
  const items = useMemo(() => createDemoItems(), []);

  return (
    <CarouselProvider
      options={{
        companySlug: "google",
        roleSlug: "product-manager",
        items,
        paywallIndex: null,
        hasPremiumAccess: true,
      }}
    >
      <ConversationProvider initialDisplayMode="conversational">
        <ConversationFlow />
      </ConversationProvider>
    </CarouselProvider>
  );
}

// Styles
const pageContainerStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100dvh",
  backgroundColor: "var(--background, #fff)",
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  position: "relative",
  maxWidth: "100%",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border, #e5e7eb)",
  backgroundColor: "var(--background, #fff)",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const menuButtonStyle: React.CSSProperties = {
  padding: "8px",
  fontSize: "20px",
  background: "none",
  border: "none",
  cursor: "pointer",
  borderRadius: "8px",
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--foreground, #111)",
};

const closeButtonStyle: React.CSSProperties = {
  padding: "8px",
  fontSize: "18px",
  background: "none",
  border: "none",
  cursor: "pointer",
  borderRadius: "8px",
  color: "var(--text-muted, #6b7280)",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
  padding: "32px",
  color: "var(--text-muted, #6b7280)",
};

const exitButtonStyle: React.CSSProperties = {
  padding: "12px 24px",
  backgroundColor: "var(--primary, #2563eb)",
  color: "white",
  border: "none",
  borderRadius: "9999px",
  fontSize: "16px",
  fontWeight: 600,
  cursor: "pointer",
};

const progressBarContainerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: "4px",
  backgroundColor: "var(--border, #e5e7eb)",
  zIndex: 20,
};

const progressBarFillStyle: React.CSSProperties = {
  height: "100%",
  backgroundColor: "var(--primary, #2563eb)",
  transition: "width 0.3s ease",
};
