"use client";

import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import type {
  TextBlock as TextBlockType,
  HeaderBlock as HeaderBlockType,
  QuoteBlock as QuoteBlockType,
  TipBlock as TipBlockType,
  WarningBlock as WarningBlockType,
} from "@/types/module";
import type { BlockBaseProps, BlockTheme } from "./types";

type TextBlockProps = BlockBaseProps & {
  block: TextBlockType | HeaderBlockType | QuoteBlockType | TipBlockType | WarningBlockType;
};

const LightbulbIcon = () => (
  <svg
    className="h-5 w-5 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const WarningIcon = () => (
  <svg
    className="h-5 w-5 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

function getQuoteBorderColor(theme?: BlockTheme): string {
  if (theme?.primary) {
    return theme.primary;
  }
  return "#6366f1"; // Default indigo
}

export function TextBlock({ block, theme }: TextBlockProps) {
  const { type } = block;

  // Handle header block
  if (type === "header") {
    const headerBlock = block as HeaderBlockType;
    const Tag = `h${headerBlock.level}` as "h1" | "h2" | "h3";
    const headingClasses = {
      1: "text-3xl font-bold",
      2: "text-2xl font-semibold",
      3: "text-xl font-medium",
    };

    return (
      <Tag className={cn(headingClasses[headerBlock.level], "text-gray-900")}>
        {headerBlock.content}
      </Tag>
    );
  }

  // Handle quote block
  if (type === "quote") {
    const quoteBlock = block as QuoteBlockType;
    return (
      <blockquote
        className="border-l-4 pl-4 py-2 italic text-gray-700 bg-gray-50 rounded-r"
        style={{ borderColor: getQuoteBorderColor(theme) }}
      >
        <div className="prose prose-gray">
          <ReactMarkdown>{quoteBlock.content}</ReactMarkdown>
        </div>
        {quoteBlock.author && (
          <footer className="mt-2 text-sm text-gray-500 not-italic">
            — {quoteBlock.author}
          </footer>
        )}
      </blockquote>
    );
  }

  // Handle tip block
  if (type === "tip") {
    const tipBlock = block as TipBlockType;
    return (
      <div
        className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
        role="note"
        aria-label="Tip"
      >
        <LightbulbIcon />
        <div className="prose prose-green prose-sm">
          <ReactMarkdown>{tipBlock.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // Handle warning block
  if (type === "warning") {
    const warningBlock = block as WarningBlockType;
    return (
      <div
        className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800"
        role="alert"
      >
        <WarningIcon />
        <div className="prose prose-amber prose-sm">
          <ReactMarkdown>{warningBlock.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // Default text block
  const textBlock = block as TextBlockType;
  return (
    <div className="prose prose-gray max-w-none">
      <ReactMarkdown>{textBlock.content}</ReactMarkdown>
    </div>
  );
}
