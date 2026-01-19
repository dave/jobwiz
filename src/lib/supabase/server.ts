/**
 * Server-side Supabase client
 * Uses @supabase/ssr for cookie-based auth management
 */

import { createServerClient as createClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for server-side use (Server Components, Route Handlers)
 * Cookie mutations will log a warning in Server Components (read-only context)
 * For session refresh, use middleware instead
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from Server Components where cookies are read-only
            // This is expected - session refresh should happen in middleware
          }
        },
      },
    }
  );
}

/**
 * Gets the current session from the server
 * Used to pass initial session to client-side AuthProvider to prevent flicker
 */
export async function getServerSession() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
