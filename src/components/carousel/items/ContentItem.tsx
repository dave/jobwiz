"use client";

import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import type {
  ContentBlock,
  TextBlock,
  HeaderBlock,
  QuoteBlock,
  TipBlock,
  WarningBlock,
} from "@/types/module";

export interface ContentItemProps {
  /** The content block to render */
  block: ContentBlock;
  /** Called when the item is considered complete (e.g., read) */
  onComplete?: () => void;
  /** Custom class name */
  className?: string;
}

const LightbulbIcon = () => (
  <svg
    className="h-5 w-5 sm:h-7 sm:w-7 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const WarningIcon = () => (
  <svg
    className="h-5 w-5 sm:h-7 sm:w-7 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const QuoteIcon = () => (
  <svg
    className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300"
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
);

/**
 * ContentItem - Carousel-optimized content block renderer
 *
 * Renders text-based content blocks (text, header, quote, tip, warning)
 * with centered layout, large typography, and minimal UI for carousel display.
 */
export function ContentItem({ block, className }: ContentItemProps) {
  const { type } = block;

  // Handle header block - centered, large heading
  if (type === "header") {
    const headerBlock = block as HeaderBlock;
    const headingStyles = {
      1: "text-2xl sm:text-4xl font-bold",
      2: "text-xl sm:text-3xl font-semibold",
      3: "text-lg sm:text-2xl font-medium",
    };

    return (
      <div
        className={cn(
          "flex items-center justify-center min-h-[40vh] sm:min-h-[50vh]",
          "text-center px-4",
          className
        )}
      >
        <h1 className={cn(headingStyles[headerBlock.level], "text-gray-900 leading-tight")}>
          {headerBlock.content}
        </h1>
      </div>
    );
  }

  // Handle quote block - centered, emphasized
  if (type === "quote") {
    const quoteBlock = block as QuoteBlock;
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[50vh]",
          "text-center px-4 py-6 sm:py-8",
          className
        )}
      >
        <QuoteIcon />
        <blockquote className="mt-3 sm:mt-4 max-w-2xl">
          <p className="text-lg sm:text-2xl font-light text-gray-800 leading-relaxed italic">
            {quoteBlock.content}
          </p>
          {quoteBlock.author && (
            <footer className="mt-4 sm:mt-6 text-base sm:text-lg text-gray-500 font-medium not-italic">
              — {quoteBlock.author}
            </footer>
          )}
        </blockquote>
      </div>
    );
  }

  // Handle tip block - highlighted callout
  if (type === "tip") {
    const tipBlock = block as TipBlock;
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[50vh]",
          "px-3 sm:px-4 py-6 sm:py-8",
          className
        )}
      >
        <div
          className={cn(
            "w-full max-w-2xl",
            "bg-green-50 border-2 border-green-200 rounded-2xl",
            "p-5 sm:p-8"
          )}
          role="note"
          aria-label="Tip"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 text-green-600 shrink-0">
              <LightbulbIcon />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-green-700 uppercase tracking-wide">
                Pro Tip
              </span>
              <div className="mt-1.5 sm:mt-2 text-base sm:text-xl text-green-900 leading-relaxed prose prose-green prose-sm sm:prose-lg max-w-none">
                <ReactMarkdown>{tipBlock.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle warning block - attention-grabbing callout
  if (type === "warning") {
    const warningBlock = block as WarningBlock;
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[50vh]",
          "px-3 sm:px-4 py-6 sm:py-8",
          className
        )}
      >
        <div
          className={cn(
            "w-full max-w-2xl",
            "bg-amber-50 border-2 border-amber-200 rounded-2xl",
            "p-5 sm:p-8"
          )}
          role="alert"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 text-amber-600 shrink-0">
              <WarningIcon />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-amber-700 uppercase tracking-wide">
                Watch Out
              </span>
              <div className="mt-1.5 sm:mt-2 text-base sm:text-xl text-amber-900 leading-relaxed prose prose-amber prose-sm sm:prose-lg max-w-none">
                <ReactMarkdown>{warningBlock.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default text block - centered, readable typography
  const textBlock = block as TextBlock;
  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-[40vh] sm:min-h-[50vh]",
        "px-3 sm:px-4 py-6 sm:py-8",
        className
      )}
    >
      <div className="w-full max-w-2xl">
        <div className="text-base sm:text-xl text-gray-800 leading-relaxed prose prose-gray prose-sm sm:prose-lg max-w-none">
          <ReactMarkdown>{textBlock.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
