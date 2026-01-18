"use client";

import { JourneyContainer } from "@/components/journey/JourneyContainer";
import { BlockRenderer } from "@/components/blocks";
import type { JourneyConfig } from "@/types";
import type { ContentBlock } from "@/types/module";

const demoJourneyConfig: JourneyConfig = {
  id: "demo-journey",
  companySlug: "demo",
  roleSlug: "demo-role",
  steps: [
    {
      id: "step-1",
      title: "Welcome to Interview Prep",
      type: "content",
      moduleId: "intro",
      required: false,
      estimatedMinutes: 2,
    },
    {
      id: "step-2",
      title: "Understanding the Company",
      type: "content",
      moduleId: "company",
      required: true,
      estimatedMinutes: 5,
    },
    {
      id: "step-3",
      title: "Common Questions",
      type: "quiz",
      moduleId: "questions",
      required: true,
      estimatedMinutes: 10,
    },
    {
      id: "step-4",
      title: "Final Checklist",
      type: "checklist",
      moduleId: "checklist",
      required: false,
      estimatedMinutes: 3,
    },
  ],
};

// Demo content for each step
const stepContent: Record<string, ContentBlock[]> = {
  "step-1": [
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
        "This demo shows the **Step Navigation** component in action. Use the **Continue** button below to advance, or press **Enter** on your keyboard. You can also press **Escape** to go back.",
    },
    {
      id: "welcome-tip",
      type: "tip",
      content:
        "Notice how the Back button is hidden on the first step, and will appear once you navigate forward.",
    },
  ],
  "step-2": [
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
        "This step is **required** - you must complete it to continue. Notice the Continue button is disabled until you mark this step complete.",
    },
    {
      id: "company-checklist",
      type: "checklist",
      title: "Complete these tasks",
      items: [
        { id: "c1", text: "Research company values", required: true },
        { id: "c2", text: "Review recent news", required: true },
      ],
    },
  ],
  "step-3": [
    {
      id: "quiz-header",
      type: "header",
      content: "Test Your Knowledge",
      level: 1,
    },
    {
      id: "quiz-1",
      type: "quiz",
      question: "What keyboard shortcut advances to the next step?",
      options: [
        { id: "a", text: "Space bar", isCorrect: false },
        { id: "b", text: "Enter key", isCorrect: true },
        { id: "c", text: "Arrow Right", isCorrect: false },
      ],
      explanation:
        "Pressing Enter advances to the next step (when available), while Escape goes back.",
    },
  ],
  "step-4": [
    {
      id: "final-header",
      type: "header",
      content: "Final Checklist",
      level: 1,
    },
    {
      id: "final-text",
      type: "text",
      content:
        "This is the **last step**. Notice the button now says **Complete** instead of **Continue**.",
    },
    {
      id: "final-quote",
      type: "quote",
      content:
        "The journey of a thousand miles begins with a single step... and ends with good navigation.",
      author: "Anonymous Developer",
    },
  ],
};

export default function JourneyDemoPage() {
  return (
    <JourneyContainer
      config={demoJourneyConfig}
      onComplete={() => {
        alert("Journey completed!");
      }}
    >
      {(stepId) => (
        <div className="space-y-6">
          {stepContent[stepId]?.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              onComplete={() => {}}
              theme={{ primary: "#4f46e5" }}
            />
          ))}
        </div>
      )}
    </JourneyContainer>
  );
}
