"use client";

/**
 * Learn Content - Client component for interactive journey
 * Issue: #117 - Freemium model with paywall
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JourneyContainer } from "@/components/journey";
import { BlockRenderer } from "@/components/blocks";
import type { JourneyConfig, JourneyStep } from "@/types";
import type { PreviewContent } from "@/lib/content-fetching";
import type { ContentBlock } from "@/types/module";

interface LearnContentProps {
  companySlug: string;
  roleSlug: string;
  companyName: string;
  roleName: string;
  initialContent: PreviewContent | null;
}

export function LearnContent({
  companySlug,
  roleSlug,
  companyName,
  roleName,
  initialContent,
}: LearnContentProps) {
  const router = useRouter();

  // Convert modules to JourneyConfig
  const { config, blocksByStep } = useMemo(() => {
    if (!initialContent || initialContent.modules.length === 0) {
      // Fallback demo content if no modules loaded
      return {
        config: createFallbackConfig(companySlug, roleSlug),
        blocksByStep: createFallbackBlocks(companyName, roleName),
      };
    }

    const steps: JourneyStep[] = [];
    const blocks: Record<string, ContentBlock[]> = {};

    // Create steps from modules and their sections
    for (const mod of initialContent.modules) {
      for (const section of mod.sections) {
        const stepId = `${mod.id}-${section.id}`;
        steps.push({
          id: stepId,
          title: section.title || mod.title,
          type: "content",
          moduleId: mod.id,
          sectionId: section.id,
          required: false,
          estimatedMinutes: Math.max(1, Math.ceil(section.blocks.length * 0.5)),
        });
        blocks[stepId] = section.blocks;
      }
    }

    const journeyConfig: JourneyConfig = {
      id: `${companySlug}-${roleSlug}-journey`,
      companySlug,
      roleSlug,
      steps,
    };

    return { config: journeyConfig, blocksByStep: blocks };
  }, [initialContent, companySlug, roleSlug, companyName, roleName]);

  // Handle journey completion
  const handleComplete = () => {
    router.push(`/${companySlug}/${roleSlug}/journey`);
  };

  // No content available
  if (!initialContent && config.steps.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Content Coming Soon
          </h1>
          <p className="text-gray-600 mb-6">
            We're preparing your {companyName} {roleName} interview prep content.
          </p>
          <Link
            href={`/${companySlug}/${roleSlug}/journey`}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Journey Overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <JourneyContainer config={config} onComplete={handleComplete}>
      {(stepId) => (
        <div className="space-y-6">
          {blocksByStep[stepId]?.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              onComplete={() => {}}
              theme={{ primary: "#2563eb" }}
            />
          ))}
        </div>
      )}
    </JourneyContainer>
  );
}

/**
 * Create fallback config when no content is loaded from Supabase
 */
function createFallbackConfig(
  companySlug: string,
  roleSlug: string
): JourneyConfig {
  return {
    id: `${companySlug}-${roleSlug}-journey`,
    companySlug,
    roleSlug,
    steps: [
      {
        id: "intro",
        title: "Welcome to Your Interview Prep",
        type: "content",
        moduleId: "intro",
        required: false,
        estimatedMinutes: 2,
      },
      {
        id: "fundamentals",
        title: "Interview Fundamentals",
        type: "content",
        moduleId: "fundamentals",
        required: true,
        estimatedMinutes: 5,
      },
    ],
  };
}

/**
 * Create fallback content blocks
 */
function createFallbackBlocks(
  companyName: string,
  roleName: string
): Record<string, ContentBlock[]> {
  return {
    intro: [
      {
        id: "intro-header",
        type: "header",
        content: `Welcome to Your ${companyName} ${roleName} Interview Prep`,
        level: 1,
      },
      {
        id: "intro-text",
        type: "text",
        content: `This journey will guide you through everything you need to prepare for your **${companyName}** interview for the **${roleName}** position. Let's get started!`,
      },
      {
        id: "intro-tip",
        type: "tip",
        content:
          "Use the **Continue** button below or press **Enter** to advance. Press **Escape** to go back.",
      },
    ],
    fundamentals: [
      {
        id: "fund-header",
        type: "header",
        content: "Interview Fundamentals",
        level: 1,
      },
      {
        id: "fund-text",
        type: "text",
        content:
          "Every great interview starts with mastering the fundamentals. The **STAR method** (Situation, Task, Action, Result) is your foundation for answering behavioral questions effectively.",
      },
      {
        id: "fund-quiz",
        type: "quiz",
        question: "What does the 'A' in STAR stand for?",
        options: [
          { id: "a", text: "Assessment", isCorrect: false },
          { id: "b", text: "Action", isCorrect: true },
          { id: "c", text: "Analysis", isCorrect: false },
          { id: "d", text: "Approach", isCorrect: false },
        ],
        explanation:
          "STAR stands for Situation, Task, Action, Result. The Action component describes what you specifically did to address the situation.",
      },
    ],
  };
}
