"use client";

/**
 * Client-side Providers
 * Wraps the application with necessary context providers
 */

import { AuthProvider } from "@/lib/auth";
import { AnalyticsProvider } from "@/lib/analytics";
import { Suspense, type ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </Suspense>
    </AuthProvider>
  );
}
