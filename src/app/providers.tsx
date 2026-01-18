"use client";

/**
 * Client-side Providers
 * Wraps the application with necessary context providers
 */

import { AuthProvider } from "@/lib/auth";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
