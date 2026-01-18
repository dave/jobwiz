"use client";

import { BlockRenderer } from "@/components/blocks";
import type { ContentBlock } from "@/types/module";

const demoBlocks: ContentBlock[] = [
  {
    id: "header-1",
    type: "header",
    content: "Content Block Demo",
    level: 1,
  },
  {
    id: "text-1",
    type: "text",
    content:
      "This page demonstrates all the **content block components** for the Ace That Interview interview prep platform. Each block type renders *differently* and serves a specific purpose.",
  },
  {
    id: "header-2",
    type: "header",
    content: "Tips and Warnings",
    level: 2,
  },
  {
    id: "tip-1",
    type: "tip",
    content:
      "**Pro tip:** Always research the company's recent news before your interview. This shows genuine interest and helps you ask better questions.",
  },
  {
    id: "warning-1",
    type: "warning",
    content:
      "**Warning:** Never speak negatively about your previous employer, even if asked directly. Frame challenges as learning opportunities.",
  },
  {
    id: "header-3",
    type: "header",
    content: "Quotes from Interviewers",
    level: 2,
  },
  {
    id: "quote-1",
    type: "quote",
    content:
      "The best candidates don't just answer questions—they have a conversation with us about solving real problems.",
    author: "Former Google Hiring Manager",
  },
  {
    id: "header-4",
    type: "header",
    content: "Test Your Knowledge",
    level: 2,
  },
  {
    id: "quiz-1",
    type: "quiz",
    question: "What is the STAR method used for in interviews?",
    options: [
      { id: "a", text: "Rating interview performance", isCorrect: false },
      {
        id: "b",
        text: "Structuring behavioral answers (Situation, Task, Action, Result)",
        isCorrect: true,
      },
      { id: "c", text: "Evaluating technical skills", isCorrect: false },
      { id: "d", text: "Scheduling interview times", isCorrect: false },
    ],
    explanation:
      "STAR stands for Situation, Task, Action, Result. It's a framework for structuring responses to behavioral interview questions, helping you provide concrete examples of your past experiences.",
  },
  {
    id: "header-5",
    type: "header",
    content: "Pre-Interview Checklist",
    level: 2,
  },
  {
    id: "checklist-1",
    type: "checklist",
    title: "Day-Before Interview Prep",
    items: [
      { id: "c1", text: "Research the company's recent news and achievements", required: true },
      { id: "c2", text: "Review the job description and match your experience", required: true },
      { id: "c3", text: "Prepare 3-5 questions to ask the interviewer", required: true },
      { id: "c4", text: "Plan your outfit and test your video setup", required: false },
      { id: "c5", text: "Get a good night's sleep", required: false },
    ],
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        {demoBlocks.map((block) => (
          <div key={block.id} className="bg-white rounded-lg shadow-sm p-6">
            <BlockRenderer
              block={block}
              onComplete={() => console.log(`Block ${block.id} completed`)}
              theme={{ primary: "#4f46e5" }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
