/**
 * Browser-side Supabase client
 * Uses @supabase/ssr for cookie-based auth management
 */

import { createBrowserClient as createClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
