"use client";

/**
 * Client-side Providers
 * Wraps the application with necessary context providers
 */

import { AuthProvider } from "@/lib/auth";
import { AnalyticsProvider } from "@/lib/analytics";
import { Suspense, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

interface ProvidersProps {
  children: ReactNode;
  initialSession?: Session | null;
}

export function Providers({ children, initialSession }: ProvidersProps) {
  return (
    <AuthProvider initialSession={initialSession}>
      <Suspense fallback={null}>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </Suspense>
    </AuthProvider>
  );
}
