"use client";

/**
 * Learn Carousel Content - Client component for conversation-based learning
 * Issue: #193 - 4.2: Learn page integration
 *
 * Loads modules, flattens to carousel items, and renders ConversationContainer
 * with Lemonade-style conversational UI.
 */

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CarouselProvider,
  CarouselPaywall,
  MediaItem,
  useCarousel,
} from "@/components/carousel";
import {
  ConversationContainer,
  ConversationalQuiz,
  ConversationalContent,
  ConversationalChecklist,
} from "@/components/alex";
import type { CarouselItem } from "@/types/carousel";
import type {
  QuizBlock,
  ChecklistBlock,
  VideoBlock,
  AudioBlock,
  ImageBlock,
  InfographicBlock,
  TextBlock,
  QuoteBlock,
  TipBlock,
  WarningBlock,
  HeaderBlock,
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
}

/**
 * Inner content that renders within CarouselProvider and ConversationContainer
 */
function ConversationContentInner({
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
  const { currentItem, markComplete, next, isLastItem, isAtPaywall } = useCarousel();

  // Handle exit - return to journey overview
  const handleExit = useCallback(() => {
    router.push(`/${companySlug}/${roleSlug}/journey`);
  }, [router, companySlug, roleSlug]);

  // Handle purchase - redirect to Stripe checkout
  const handlePurchase = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_slug: companySlug,
          role_slug: roleSlug,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `Checkout failed: ${res.status}`;
        console.error("Checkout error:", errorMsg);
        return false;
      }

      const data = await res.json();
      if (data.url) {
        // Redirect to Stripe - return false so paywall doesn't mark as unlocked
        // The actual unlock happens on checkout success page after payment completes
        window.location.href = data.url;
        return false;
      }

      console.error("No checkout URL returned");
      return false;
    } catch (error) {
      console.error("Checkout error:", error);
      return false;
    }
  }, [companySlug, roleSlug]);

  // Handle item completion - mark as complete and advance
  const handleItemComplete = useCallback(() => {
    if (currentItem) {
      markComplete(currentItem.id);
      // Automatically advance if not at last item and not at paywall
      if (!isLastItem && !isAtPaywall) {
        next();
      }
    }
  }, [currentItem, markComplete, next, isLastItem, isAtPaywall]);

  // Render the current item based on its type
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
          price={199} // $199 in dollars
          heading={`Unlock ${companyName} ${roleName} Prep`}
          description={`Get full access to company-specific interview prep, practice questions, and insider tips for ${companyName}.`}
          benefits={[
            `${companyName}-specific interview questions`,
            `${roleName} role preparation guide`,
            "Company culture and values analysis",
            "Insider tips from successful candidates",
          ]}
          mockMode={process.env.NODE_ENV === "development"}
          onPurchase={handlePurchase}
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

    // Handle checklist items - use ConversationalChecklist
    if (type === "checklist" || content.type === "checklist") {
      return (
        <ConversationalChecklist
          itemId={id}
          checklist={content as ChecklistBlock}
          onComplete={handleItemComplete}
        />
      );
    }

    // Handle media items (video, audio, image, infographic) - use MediaItem with big-question variant
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
          variant="big-question"
        />
      );
    }

    // Handle header blocks - use MediaItem with big-question variant for dramatic display
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
  }, [
    currentItem,
    companyName,
    roleName,
    handleItemComplete,
    handlePurchase,
  ]);

  return (
    <ConversationContainer onExit={handleExit} data-testid="conversation-container">
      {renderCurrentItem()}
    </ConversationContainer>
  );
}

export function LearnCarouselContent({
  companySlug,
  roleSlug,
  companyName,
  roleName,
  flattenedResult,
  hasPremiumAccess = false,
}: LearnCarouselContentProps) {
  const searchParams = useSearchParams();

  // Get start index from query param (for jumping to specific module)
  // Clamp to paywall index if user doesn't have premium access
  const startIndex = useMemo(() => {
    const start = searchParams.get("start");
    if (start) {
      const parsed = parseInt(start, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        // Don't allow jumping past paywall without premium access
        if (!hasPremiumAccess && flattenedResult?.paywallIndex !== null && flattenedResult?.paywallIndex !== undefined) {
          return Math.min(parsed, flattenedResult.paywallIndex);
        }
        return parsed;
      }
    }
    return undefined;
  }, [searchParams, hasPremiumAccess, flattenedResult?.paywallIndex]);

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
        initialIndex: startIndex,
      }}
    >
      <ConversationContentInner
        companySlug={companySlug}
        roleSlug={roleSlug}
        companyName={companyName}
        roleName={roleName}
      />
    </CarouselProvider>
  );
}
