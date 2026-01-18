"use client";

import type { ContentBlock } from "@/types/module";
import type { BlockTheme } from "./types";
import { TextBlock } from "./TextBlock";
import { VideoBlock } from "./VideoBlock";
import { AudioBlock } from "./AudioBlock";
import { InfographicBlock } from "./InfographicBlock";
import { AnimationBlock } from "./AnimationBlock";
import { QuizBlock } from "./QuizBlock";
import { ChecklistBlock } from "./ChecklistBlock";

export interface BlockRendererProps {
  block: ContentBlock;
  /** Called when the block is completed */
  onComplete?: () => void;
  /** Theme colors for company branding */
  theme?: BlockTheme;
}

export function BlockRenderer({ block, onComplete, theme }: BlockRendererProps) {
  const { type } = block;

  switch (type) {
    case "text":
    case "header":
    case "quote":
    case "tip":
    case "warning":
      return <TextBlock block={block} onComplete={onComplete} theme={theme} />;

    case "video":
      return <VideoBlock block={block} onComplete={onComplete} theme={theme} />;

    case "audio":
      return <AudioBlock block={block} onComplete={onComplete} theme={theme} />;

    case "image":
    case "infographic":
      return <InfographicBlock block={block} onComplete={onComplete} theme={theme} />;

    case "animation":
      return <AnimationBlock block={block} onComplete={onComplete} theme={theme} />;

    case "quiz":
      return <QuizBlock block={block} onComplete={onComplete} theme={theme} />;

    case "checklist":
      return <ChecklistBlock block={block} onComplete={onComplete} theme={theme} />;

    default: {
      // This should never happen with proper types, but handle gracefully
      const unknownBlock = block as { type: string };
      console.warn(`Unknown block type: ${unknownBlock.type}`);
      return null;
    }
  }
}
