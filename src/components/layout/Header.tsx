"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/lib/auth/context";

interface HeaderProps {
  /** Initial logged-in state from server to prevent hydration flicker */
  initialIsLoggedIn?: boolean;
}

export function Header({ initialIsLoggedIn }: HeaderProps) {
  const { user, loading, signOut } = useAuthContext();
  const pathname = usePathname();

  // Use server-provided state for initial render to prevent flicker
  // Once auth context loads, it takes over
  const isLoggedIn = loading ? initialIsLoggedIn : !!user;

  // Hide header on learn pages to let users focus
  if (pathname?.includes("/journey/learn")) {
    return null;
  }

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          Ace That Interview
        </Link>

        <nav className="flex items-center gap-4">
          {/* Only show loading skeleton if we don't have initial state from server */}
          {loading && initialIsLoggedIn === undefined ? (
            <div className="h-9 w-20 bg-gray-100 rounded animate-pulse" />
          ) : isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
                title="Settings"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
