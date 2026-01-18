"use client";

import { AuthForm, SocialLoginButtons, MagicLinkForm } from "@/components/auth";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function LoginContentInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || undefined;
  const [showMagicLink, setShowMagicLink] = useState(false);

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-lg bg-white px-6 py-8 shadow-sm ring-1 ring-gray-900/5">
        <SocialLoginButtons redirectTo={redirectTo} />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        {showMagicLink ? (
          <>
            <MagicLinkForm redirectTo={redirectTo} />
            <button
              type="button"
              onClick={() => setShowMagicLink(false)}
              className="mt-4 w-full text-center text-sm text-gray-600 hover:text-gray-500"
            >
              Sign in with password instead
            </button>
          </>
        ) : (
          <>
            <AuthForm mode="login" redirectTo={redirectTo} />
            <button
              type="button"
              onClick={() => setShowMagicLink(true)}
              className="mt-4 w-full text-center text-sm text-gray-600 hover:text-gray-500"
            >
              Sign in with magic link
            </button>
          </>
        )}
      </div>

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <a
          href={`/signup${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Sign up
        </a>
      </p>
    </div>
  );
}

export function LoginContent() {
  return (
    <Suspense fallback={<div className="mt-8 text-center text-gray-500">Loading...</div>}>
      <LoginContentInner />
    </Suspense>
  );
}
