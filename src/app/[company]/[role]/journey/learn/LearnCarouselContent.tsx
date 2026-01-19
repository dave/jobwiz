"use client";

/**
 * Learn Carousel Content - Client component for carousel-based learning
 * Issue: #134 - C2: LearnCarouselContent component
 *
 * Loads modules, flattens to carousel items, and renders CarouselContainer
 * with proper content rendering based on item type.
 */

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CarouselProvider,
  CarouselContainer,
  CarouselPaywall,
  ContentItem,
  QuizItem,
  MediaItem,
  ChecklistItem,
  useCarousel,
} from "@/components/carousel";
import type { CarouselItem } from "@/types/carousel";
import type {
  QuizBlock,
  ChecklistBlock,
  VideoBlock,
  AudioBlock,
  ImageBlock,
  InfographicBlock,
} from "@/types/module";
import type { FlattenResult } from "@/lib/carousel";

export interface LearnCarouselContentProps {
  companySlug: string;
  roleSlug: string;
  companyName: string;
  roleName: string;
  /** Pre-loaded and flattened carousel items */
  flattenedResult: FlattenResult | null;
  /** Whether user has premium access */
  hasPremiumAccess?: boolean;
  /** Optional starting index (for jumping to a specific module) */
  startAtIndex?: number;
}

/**
 * Inner carousel content that renders within CarouselProvider
 */
function CarouselContentInner({
  companySlug,
  roleSlug,
  companyName,
  roleName,
}: {
  companySlug: string;
  roleSlug: string;
  companyName: string;
  roleName: string;
}) {
  const router = useRouter();
  const { currentItem, markComplete, next, isLastItem } = useCarousel();

  // Handle exit - return to journey overview
  const handleExit = useCallback(() => {
    router.push(`/${companySlug}/${roleSlug}/journey`);
  }, [router, companySlug, roleSlug]);

  // Handle item completion - mark as complete and advance
  const handleItemComplete = useCallback(() => {
    if (currentItem) {
      markComplete(currentItem.id);
      // Automatically advance if not at last item
      if (!isLastItem) {
        next();
      }
    }
  }, [currentItem, markComplete, next, isLastItem]);

  // Render the current item based on its type
  const renderCurrentItem = useCallback(() => {
    if (!currentItem) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
          No content available
        </div>
      );
    }

    const { type, content } = currentItem;

    // Handle paywall items
    if (type === "paywall") {
      return (
        <CarouselPaywall
          price={20000} // $200 in cents
          heading={`Unlock ${companyName} ${roleName} Prep`}
          description={`Get full access to company-specific interview prep, practice questions, and insider tips for ${companyName}.`}
          benefits={[
            `${companyName}-specific interview questions`,
            `${roleName} role preparation guide`,
            "Company culture and values analysis",
            "Insider tips from successful candidates",
          ]}
          mockMode={process.env.NODE_ENV === "development"}
        />
      );
    }

    // Handle quiz items
    if (type === "quiz" || content.type === "quiz") {
      return (
        <QuizItem
          block={content as QuizBlock}
          onComplete={handleItemComplete}
        />
      );
    }

    // Handle media items (video, audio, image, infographic)
    if (
      content.type === "video" ||
      content.type === "audio" ||
      content.type === "image" ||
      content.type === "infographic"
    ) {
      return (
        <MediaItem
          block={
            content as VideoBlock | AudioBlock | ImageBlock | InfographicBlock
          }
          onComplete={handleItemComplete}
        />
      );
    }

    // Handle checklist items
    if (type === "checklist" || content.type === "checklist") {
      return (
        <ChecklistItem
          block={content as ChecklistBlock}
          onComplete={handleItemComplete}
        />
      );
    }

    // Default to content items (text, header, quote, tip, warning)
    return (
      <ContentItem block={content} onComplete={handleItemComplete} />
    );
  }, [
    currentItem,
    companyName,
    roleName,
    handleItemComplete,
  ]);

  return (
    <CarouselContainer onExit={handleExit}>
      {renderCurrentItem()}
    </CarouselContainer>
  );
}

export function LearnCarouselContent({
  companySlug,
  roleSlug,
  companyName,
  roleName,
  flattenedResult,
  hasPremiumAccess = false,
  startAtIndex,
}: LearnCarouselContentProps) {
  const router = useRouter();

  // Extract items and paywall index from flattened result
  const { items, paywallIndex } = useMemo(() => {
    if (!flattenedResult || flattenedResult.items.length === 0) {
      return { items: [] as CarouselItem[], paywallIndex: null };
    }
    return {
      items: flattenedResult.items,
      paywallIndex: flattenedResult.paywallIndex,
    };
  }, [flattenedResult]);

  // Handle case where no content is available
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Content Coming Soon
          </h1>
          <p className="text-gray-600 mb-6">
            We&apos;re preparing your {companyName} {roleName} interview prep
            content.
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
    <CarouselProvider
      options={{
        companySlug,
        roleSlug,
        items,
        paywallIndex,
        hasPremiumAccess,
        initialIndex: startAtIndex,
      }}
    >
      <CarouselContentInner
        companySlug={companySlug}
        roleSlug={roleSlug}
        companyName={companyName}
        roleName={roleName}
      />
    </CarouselProvider>
  );
}
