"use client";

/**
 * Profile Content
 * Issue: #57 - Protected route middleware
 *
 * Client component that displays the user's profile
 * Protected by middleware - requires authentication
 */

import { useRequireAuth, useAuthContext } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileContent() {
  const { user, loading, error } = useRequireAuth();
  const { signOut } = useAuthContext();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

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
          <p className="text-red-600">Error loading profile: {error.message}</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Profile Header */}
          <div className="px-6 py-8 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full border-4 border-white"
                />
              ) : (
                <div className="h-20 w-20 rounded-full border-4 border-white bg-white flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {(user.displayName ?? user.email ?? "U").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="ml-6">
                <h2 className="text-2xl font-bold text-white">
                  {user.displayName ?? "User"}
                </h2>
                <p className="text-blue-100">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h3>

            <dl className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="mt-1 sm:mt-0 text-sm text-gray-900 font-mono">
                  {user.id}
                </dd>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 sm:mt-0 text-sm text-gray-900">
                  {user.email ?? "Not set"}
                </dd>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="text-sm font-medium text-gray-500">Display Name</dt>
                <dd className="mt-1 sm:mt-0 text-sm text-gray-900">
                  {user.displayName ?? "Not set"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
