"use client";

import { AuthForm, SocialLoginButtons } from "@/components/auth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignupContentInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || undefined;

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-lg bg-white px-6 py-8 shadow-sm ring-1 ring-gray-900/5">
        <SocialLoginButtons redirectTo={redirectTo} />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with email</span>
          </div>
        </div>

        <AuthForm mode="signup" redirectTo={redirectTo} />
      </div>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a
          href={`/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Sign in
        </a>
      </p>

      <p className="text-center text-xs text-gray-500">
        By signing up, you agree to our{" "}
        <a href="/terms" className="text-blue-600 hover:text-blue-500">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-blue-600 hover:text-blue-500">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}

export function SignupContent() {
  return (
    <Suspense fallback={<div className="mt-8 text-center text-gray-500">Loading...</div>}>
      <SignupContentInner />
    </Suspense>
  );
}
