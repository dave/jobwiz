/**
 * Next.js Middleware for Protected Routes
 * Issue: #57 - Protected route middleware
 *
 * Checks auth for protected routes and handles redirects:
 * - Public: /, /[company], /[company]/[role], /login, /signup
 * - Authenticated: /dashboard, /profile
 * - Purchased: /[company]/[role]/journey (premium content)
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Routes that require authentication
 */
const AUTHENTICATED_ROUTES = ["/dashboard", "/profile"];

/**
 * Routes that require a purchase (pattern-based)
 * Matches: /[company]/[role]/journey
 */
const PURCHASED_ROUTE_PATTERN = /^\/([^\/]+)\/([^\/]+)\/journey$/;

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
  if (segments.length === 2 && segments[1] !== "journey") {
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

/**
 * Check if route requires a purchase and extract company/role
 */
function requiresPurchase(path: string): { company: string; role: string } | null {
  const match = path.match(PURCHASED_ROUTE_PATTERN);
  if (match && match[1] && match[2]) {
    return { company: match[1], role: match[2] };
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Skip public routes
  if (isPublicRoute(pathname)) {
    return response;
  }

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

  // Refresh session if expired
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Handle authenticated routes
  if (requiresAuth(pathname)) {
    if (!user) {
      // Redirect to login with return URL
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Handle purchased routes
  const purchaseCheck = requiresPurchase(pathname);
  if (purchaseCheck) {
    if (!user) {
      // Redirect to login first
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has purchased access to this content
    const { company, role } = purchaseCheck;
    const { data: accessGrant } = await supabase
      .from("access_grants")
      .select("id")
      .eq("user_id", user.id)
      .or(`company_slug.eq.${company},company_slug.is.null`)
      .or(`role_slug.eq.${role},role_slug.is.null`)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!accessGrant) {
      // Redirect to landing page with paywall
      const landingUrl = new URL(`/${company}/${role}`, request.url);
      return NextResponse.redirect(landingUrl);
    }

    return response;
  }

  // Default: allow the request
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
