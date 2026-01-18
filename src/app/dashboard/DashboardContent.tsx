"use client";

/**
 * Dashboard Content
 * Issue: #57 - Protected route middleware
 *
 * Client component that displays the user's dashboard
 * Protected by middleware - requires authentication
 */

import { useRequireAuth } from "@/lib/auth";
import Link from "next/link";

export function DashboardContent() {
  const { user, loading, error } = useRequireAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading dashboard: {error.message}</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    // This shouldn't happen as middleware handles the redirect,
    // but include for type safety
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <Link
              href="/profile"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View Profile
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Welcome back, {user.displayName ?? user.email ?? "User"}!
          </h2>
          <p className="text-gray-600">
            Your interview prep journey starts here. Explore companies and roles
            to find the perfect preparation materials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">
              Quick Actions
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/google/software-engineer"
                  className="text-blue-600 hover:underline"
                >
                  Google Software Engineer
                </Link>
              </li>
              <li>
                <Link
                  href="/amazon/product-manager"
                  className="text-blue-600 hover:underline"
                >
                  Amazon Product Manager
                </Link>
              </li>
              <li>
                <Link
                  href="/meta/data-scientist"
                  className="text-blue-600 hover:underline"
                >
                  Meta Data Scientist
                </Link>
              </li>
            </ul>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">
              Recent Activity
            </h3>
            <p className="text-gray-500 text-sm">No recent activity yet.</p>
            <p className="text-gray-400 text-sm mt-2">
              Start exploring interview prep materials to track your progress.
            </p>
          </div>

          {/* Purchased Content */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">
              Your Purchases
            </h3>
            <p className="text-gray-500 text-sm">No purchases yet.</p>
            <p className="text-gray-400 text-sm mt-2">
              Purchase premium content to unlock full interview preparation guides.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
