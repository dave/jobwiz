"use client";

/**
 * Dashboard Content
 * Issue: #57 - Protected route middleware
 *
 * Client component that displays the user's dashboard
 * Protected by middleware - requires authentication
 * Now includes profile section (merged from /profile)
 */

import { useRequireAuth } from "@/lib/auth";
import Link from "next/link";

interface Purchase {
  id: string;
  companySlug: string | null;
  roleSlug: string | null;
  companyName: string;
  roleName: string;
  grantedAt: string;
  expiresAt: string;
}

interface DashboardContentProps {
  initialPurchases?: Purchase[];
}

export function DashboardContent({ initialPurchases = [] }: DashboardContentProps) {
  const { user, loading, error } = useRequireAuth();
  // Use initial purchases from server - no need to re-fetch
  const purchases = initialPurchases;

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Welcome Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome back!
            </h2>
            <p className="text-gray-600">
              Your interview prep journey starts here. Explore companies and roles
              to find the perfect preparation materials.
            </p>
          </div>

          {/* Purchased Content */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">
              Your Purchases
            </h3>
            {purchases.length === 0 ? (
              <>
                <p className="text-gray-500 text-sm">No purchases yet.</p>
                <p className="text-gray-400 text-sm mt-2">
                  Purchase premium content to unlock full interview preparation guides.
                </p>
              </>
            ) : (
              <ul className="space-y-3">
                {purchases.map((purchase) => (
                  <li key={purchase.id}>
                    <Link
                      href={
                        purchase.companySlug && purchase.roleSlug
                          ? `/${purchase.companySlug}/${purchase.roleSlug}/journey`
                          : "/"
                      }
                      className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        {purchase.companyName} {purchase.roleName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Purchased {new Date(purchase.grantedAt).toLocaleDateString()}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
