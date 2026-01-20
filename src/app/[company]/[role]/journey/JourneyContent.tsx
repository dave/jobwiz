"use client";

/**
 * Journey Content
 * Issue: #117 - Freemium model with paywall
 * Issue: #136 - Journey progress display
 *
 * Client component that displays the interview prep journey
 * Free modules shown to all, premium modules behind paywall
 * Now includes carousel-based progress tracking
 */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PaywallGate } from "@/components/paywall";
import { JourneyProgress } from "@/components/journey";
import { useAuth } from "@/lib/auth";
import type { Module } from "@/types/module";
import type { CarouselProgress } from "@/types/carousel";

interface JourneyContentProps {
  companySlug: string;
  roleSlug: string;
  companyName: string;
  roleName: string;
  /** All modules in order */
  allModules: Module[];
  /** Total number of carousel items */
  totalItems: number;
  /** Paywall index (null if no paywall) */
  paywallIndex: number | null;
  /** Initial access state from server (prevents flicker) */
  initialHasAccess?: boolean;
  /** Whether user is logged in (from server, prevents button text flicker) */
  isLoggedIn?: boolean;
  /** Initial progress from server cookie (prevents flicker) */
  initialProgress?: CarouselProgress | null;
}

/**
 * Get localStorage key for carousel progress
 */
function getStorageKey(companySlug: string, roleSlug: string): string {
  return `carousel-${companySlug}-${roleSlug}`;
}

/**
 * Load carousel progress from localStorage
 */
function loadPersistedProgress(
  companySlug: string,
  roleSlug: string
): CarouselProgress | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getStorageKey(companySlug, roleSlug));
    if (!stored) return null;

    const progress = JSON.parse(stored) as CarouselProgress;
    return progress;
  } catch {
    return null;
  }
}

export function JourneyContent({
  companySlug,
  roleSlug,
  companyName,
  roleName,
  allModules,
  totalItems,
  paywallIndex,
  initialHasAccess = false,
  isLoggedIn = false,
  initialProgress = null,
}: JourneyContentProps) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(initialHasAccess);
  // Only show "checking" state if user is logged in but we need to verify access
  // For logged-out users, we know they don't have access - show paywall immediately
  const [checkingAccess, setCheckingAccess] = useState(isLoggedIn && !initialHasAccess);
  // Initialize progress from server cookie if available
  const [progress, setProgress] = useState<CarouselProgress | null>(initialProgress);
  // If we have initial progress from cookie, no need to wait for localStorage load
  const [progressLoaded, setProgressLoaded] = useState(initialProgress !== null);

  // Load persisted progress from localStorage on mount (may be fresher than cookie)
  useEffect(() => {
    const loadedProgress = loadPersistedProgress(companySlug, roleSlug);
    // Only update if localStorage has data (don't overwrite cookie data with null)
    if (loadedProgress) {
      // Use localStorage if fresher than initial cookie data
      if (!initialProgress || loadedProgress.lastUpdated > (initialProgress.lastUpdated ?? 0)) {
        setProgress(loadedProgress);
      }
    }
    setProgressLoaded(true);
  }, [companySlug, roleSlug, initialProgress]);

  // Check if user has purchased access (skip if already have access from server)
  useEffect(() => {
    // If we already have access from server, no need to re-check
    if (initialHasAccess) {
      return;
    }

    async function checkAccessAsync() {
      if (!user) {
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/access?company=${companySlug}&role=${roleSlug}`
        );
        if (res.ok) {
          const data = await res.json();
          setHasAccess(data.hasAccess);
        }
      } catch {
        // Fail open - show paywall
        setHasAccess(false);
      }
      setCheckingAccess(false);
    }
    checkAccessAsync();
  }, [user, companySlug, roleSlug, initialHasAccess]);

  // Handle purchase - redirect to Stripe checkout
  const handlePurchase = async (): Promise<boolean> => {
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
        alert(`Unable to start checkout: ${errorMsg}`);
        return false;
      }

      const data = await res.json();
      if (data.url) {
        // Redirect to Stripe - return false so PaywallGate doesn't mark as unlocked
        // The actual unlock happens on checkout success page after payment completes
        window.location.href = data.url;
        return false;
      }

      console.error("No checkout URL returned");
      alert("Unable to start checkout. Please try again.");
      return false;
    } catch (error) {
      console.error("Checkout error:", error);
      alert(
        `Checkout error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return false;
    }
  };

  // Determine if there are any modules to display
  const hasModules = allModules.length > 0;

  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {hasModules ? (
          <>
            {/* Journey Progress Component */}
            <JourneyProgress
              companySlug={companySlug}
              roleSlug={roleSlug}
              companyName={companyName}
              roleName={roleName}
              allModules={allModules}
              totalItems={totalItems}
              paywallIndex={paywallIndex}
              hasPremiumAccess={hasAccess}
              progress={progress}
              progressLoading={!progressLoaded}
              isLoggedIn={isLoggedIn}
            />

            {/* Premium Unlock Section (if user doesn't have access) */}
            {!hasAccess && !checkingAccess && (
              <div className="mt-6">
                <PaywallGate
                  journeyId={`${companySlug}-${roleSlug}`}
                  price={199}
                  variant="soft"
                  mockMode={false}
                  onPurchase={handlePurchase}
                  heading={`Unlock Premium Content`}
                  description={`Get full access to ${companyName}-specific strategies, insider tips, and practice questions tailored for ${roleName} interviews.`}
                  ctaText="Get Full Access"
                >
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Premium modules are locked
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Unlock company-specific preparation, role-targeted
                      questions, and insider tips to ace your interview.
                    </p>
                  </div>
                </PaywallGate>
              </div>
            )}
          </>
        ) : (
          /* Fallback when no modules are loaded - show legacy content */
          <>
            {/* Journey Progress (legacy) */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Your Progress
                </h2>
                <span className="text-sm text-gray-500">0% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: "0%" }}
                />
              </div>
            </div>

            {/* Free Content Section */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Getting Started
                </h2>
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                  FREE
                </span>
              </div>

              <div className="space-y-4">
                <JourneyStep
                  number={1}
                  title="Interview Fundamentals"
                  description="Learn the core principles that apply to any interview, including STAR method and communication tips."
                  status="current"
                />
                <JourneyStep
                  number={2}
                  title="Industry Overview"
                  description={`Understand the ${companyName} industry landscape and what companies look for.`}
                  status="upcoming"
                />
              </div>

              <div className="mt-6">
                <Link
                  href={`/${companySlug}/${roleSlug}/journey/learn`}
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Start Free Content
                </Link>
              </div>
            </div>

            {/* Premium Content Section - Behind Paywall (unless user has access) */}
            {hasAccess ? (
              // User has purchased - show premium content directly
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {companyName}-Specific Preparation
                  </h2>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                    UNLOCKED
                  </span>
                </div>

                <div className="space-y-4">
                  <JourneyStep
                    number={3}
                    title={`${companyName} Culture & Values`}
                    description={`Deep dive into ${companyName}'s leadership principles, culture, and what they truly value.`}
                    status="upcoming"
                  />
                  <JourneyStep
                    number={4}
                    title={`${roleName} Interview Questions`}
                    description={`Practice real interview questions specific to ${roleName} roles at ${companyName}.`}
                    status="upcoming"
                  />
                  <JourneyStep
                    number={5}
                    title="Mock Interview & Final Prep"
                    description={`Put it all together with a simulated ${companyName} interview experience.`}
                    status="upcoming"
                  />
                </div>

                <div className="mt-6">
                  <Link
                    href={`/${companySlug}/${roleSlug}/journey/learn`}
                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Continue to Premium Content
                  </Link>
                </div>
              </div>
            ) : (
              // User hasn't purchased - show paywall
              <PaywallGate
                journeyId={`${companySlug}-${roleSlug}`}
                price={199}
                variant="hard"
                mockMode={false}
                onPurchase={handlePurchase}
                heading={`Unlock ${companyName} ${roleName} Prep`}
                description={`Get full access to company-specific strategies, insider tips, and practice questions tailored for ${companyName} ${roleName} interviews.`}
                ctaText="Get Full Access"
              >
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {companyName}-Specific Preparation
                    </h2>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      PREMIUM
                    </span>
                  </div>

                  <div className="space-y-4">
                    <JourneyStep
                      number={3}
                      title={`${companyName} Culture & Values`}
                      description={`Deep dive into ${companyName}'s leadership principles, culture, and what they truly value.`}
                      status="locked"
                    />
                    <JourneyStep
                      number={4}
                      title={`${roleName} Interview Questions`}
                      description={`Practice real interview questions specific to ${roleName} roles at ${companyName}.`}
                      status="locked"
                    />
                    <JourneyStep
                      number={5}
                      title="Mock Interview & Final Prep"
                      description={`Put it all together with a simulated ${companyName} interview experience.`}
                      status="locked"
                    />
                  </div>
                </div>
              </PaywallGate>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface JourneyStepProps {
  number: number;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming" | "locked";
}

function JourneyStep({ number, title, description, status }: JourneyStepProps) {
  const statusStyles = {
    completed: "bg-green-100 text-green-800 border-green-200",
    current: "bg-blue-100 text-blue-800 border-blue-200",
    upcoming: "bg-gray-100 text-gray-600 border-gray-200",
    locked: "bg-gray-50 text-gray-400 border-gray-100",
  };

  const iconStyles = {
    completed: "bg-green-600 text-white",
    current: "bg-blue-600 text-white",
    upcoming: "bg-gray-300 text-gray-600",
    locked: "bg-gray-200 text-gray-400",
  };

  return (
    <div
      className={`flex items-start p-4 rounded-lg border ${statusStyles[status]}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconStyles[status]}`}
      >
        {status === "completed" ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : status === "locked" ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <span className="text-sm font-medium">{number}</span>
        )}
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm mt-1 opacity-75">{description}</p>
      </div>
    </div>
  );
}
