"use client";

/**
 * Journey Content
 * Issue: #117 - Freemium model with paywall
 *
 * Client component that displays the interview prep journey
 * Free modules shown to all, premium modules behind paywall
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { PaywallGate } from "@/components/paywall";
import { useAuth } from "@/lib/auth";

interface JourneyContentProps {
  companySlug: string;
  roleSlug: string;
  companyName: string;
  roleName: string;
}

export function JourneyContent({
  companySlug,
  roleSlug,
  companyName,
  roleName,
}: JourneyContentProps) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check if user has purchased access
  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      try {
        const res = await fetch(`/api/access?company=${companySlug}&role=${roleSlug}`);
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
    checkAccess();
  }, [user, companySlug, roleSlug]);

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
        throw new Error("Failed to create checkout session");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Checkout error:", error);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                <Link href="/" className="hover:text-gray-700">
                  Home
                </Link>
                <span>/</span>
                <Link href={`/${companySlug}`} className="hover:text-gray-700">
                  {companyName}
                </Link>
                <span>/</span>
                <Link
                  href={`/${companySlug}/${roleSlug}`}
                  className="hover:text-gray-700"
                >
                  {roleName}
                </Link>
                <span>/</span>
                <span className="text-gray-900">Journey</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">
                {companyName} {roleName} Interview Journey
              </h1>
            </div>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Journey Progress */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
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
              href="/demo"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Start Free Content
            </Link>
          </div>
        </div>

        {/* Premium Content Section - Behind Paywall */}
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
                status={hasAccess ? "upcoming" : "locked"}
              />
              <JourneyStep
                number={4}
                title={`${roleName} Interview Questions`}
                description={`Practice real interview questions specific to ${roleName} roles at ${companyName}.`}
                status={hasAccess ? "upcoming" : "locked"}
              />
              <JourneyStep
                number={5}
                title="Mock Interview & Final Prep"
                description={`Put it all together with a simulated ${companyName} interview experience.`}
                status={hasAccess ? "upcoming" : "locked"}
              />
            </div>

            {hasAccess && (
              <div className="mt-6">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Continue to Premium Content
                </button>
              </div>
            )}
          </div>
        </PaywallGate>
      </main>
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
