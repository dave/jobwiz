"use client";

/**
 * Dashboard Content
 * Issue: #57 - Protected route middleware
 *
 * Client component that displays the user's dashboard
 * Protected by middleware - requires authentication
 * Now includes profile section (merged from /profile)
 */

import { useRequireAuth, useAuthContext } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const { signOut } = useAuthContext();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  // Use initial purchases from server - no need to re-fetch
  const purchases = initialPurchases;

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await signOut();
      router.push("/");
    } catch {
      // Error is handled by the context
    } finally {
      setSigningOut(false);
    }
  }

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
      {/* Profile Header */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt="Profile"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border-2 border-white"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border-2 border-white bg-white flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">
                    {(user.displayName ?? user.email ?? "U").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="ml-4">
                <h1 className="text-xl font-bold text-white">
                  {user.displayName ?? "User"}
                </h1>
                <p className="text-blue-100 text-sm">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2 bg-white/20 text-white font-medium rounded-md hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </header>

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
