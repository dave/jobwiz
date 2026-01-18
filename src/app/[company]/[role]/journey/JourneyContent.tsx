"use client";

/**
 * Journey Content
 * Issue: #57 - Protected route middleware
 *
 * Client component that displays the interview prep journey
 * Protected by middleware - requires authentication AND purchase
 */

import { useRequireAccess } from "@/lib/auth";
import Link from "next/link";

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
  const { hasAccess, loading, error, authLoading } = useRequireAccess(
    companySlug,
    roleSlug
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading journey: {error.message}</p>
          <Link
            href={`/${companySlug}/${roleSlug}`}
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            Return to landing page
          </Link>
        </div>
      </div>
    );
  }

  // If no access, middleware should have redirected,
  // but we'll handle it gracefully just in case
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Premium Content Required
          </h2>
          <p className="text-gray-600 mb-4">
            You need to purchase access to view this journey.
          </p>
          <Link
            href={`/${companySlug}/${roleSlug}`}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 inline-block"
          >
            View Pricing
          </Link>
        </div>
      </div>
    );
  }

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

        {/* Journey Steps */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Interview Prep Steps
          </h2>

          <div className="space-y-4">
            {/* Sample steps - these would be loaded from the journey config */}
            <JourneyStep
              number={1}
              title="Company Overview"
              description={`Learn about ${companyName}'s culture, values, and interview process.`}
              status="current"
            />
            <JourneyStep
              number={2}
              title="Role Deep Dive"
              description={`Understand what ${companyName} looks for in a ${roleName}.`}
              status="upcoming"
            />
            <JourneyStep
              number={3}
              title="Behavioral Questions"
              description="Practice answering common behavioral questions using the STAR method."
              status="upcoming"
            />
            <JourneyStep
              number={4}
              title="Technical Preparation"
              description="Review technical concepts and practice problem-solving."
              status="upcoming"
            />
            <JourneyStep
              number={5}
              title="Mock Interview"
              description="Put it all together with a simulated interview experience."
              status="locked"
            />
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-6 text-center">
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Start Step 1: Company Overview
          </button>
        </div>
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
