/**
 * Next.js Middleware for Protected Routes
 * Issue: #57 - Protected route middleware
 *
 * Checks auth for protected routes and handles redirects:
 * - Public: /, /[company], /[company]/[role], /[company]/[role]/journey, /login, /signup
 * - Authenticated: /dashboard, /profile
 *
 * Note: Journey pages are public. Premium content is gated by PaywallGate component.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Routes that require authentication
 */
const AUTHENTICATED_ROUTES = ["/dashboard", "/profile"];

/**
 * Public routes (no auth required)
 */
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/auth/callback"];

/**
 * Check if the path matches a public route pattern
 */
function isPublicRoute(path: string): boolean {
  // Exact matches
  if (PUBLIC_ROUTES.includes(path)) {
    return true;
  }

  // API routes are public (have their own auth)
  if (path.startsWith("/api/")) {
    return true;
  }

  // Static assets
  if (
    path.startsWith("/_next/") ||
    path.startsWith("/static/") ||
    path.includes(".") // files with extensions
  ) {
    return true;
  }

  // Company page: /[company] (single segment)
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 1) {
    return true;
  }

  // Company/role landing page: /[company]/[role] (two segments)
  if (segments.length === 2) {
    return true;
  }

  // Journey page: /[company]/[role]/journey (three segments)
  // Premium content is gated by PaywallGate component, not middleware
  if (segments.length === 3 && segments[2] === "journey") {
    return true;
  }

  // Journey learn page: /[company]/[role]/journey/learn (four segments)
  if (segments.length === 4 && segments[2] === "journey" && segments[3] === "learn") {
    return true;
  }

  return false;
}

/**
 * Check if route requires authentication
 */
function requiresAuth(path: string): boolean {
  return AUTHENTICATED_ROUTES.some((route) => path.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Always refresh session to keep cookies fresh
  // This must run for ALL routes so server components get valid session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle authenticated routes - redirect to login if no user
  if (requiresAuth(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
