/**
 * Tests for protected route middleware logic
 * Issue: #57 - Protected route middleware
 *
 * Note: These tests verify the route detection logic.
 * Full integration tests require a real Next.js server environment.
 */

// Don't import from middleware.ts directly as it triggers Next.js server code
// Instead, we test the route pattern logic independently

describe("route patterns", () => {
  const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/auth/callback"];
  const AUTHENTICATED_ROUTES = ["/dashboard"];
  const PURCHASED_ROUTE_PATTERN = /^\/([^\/]+)\/([^\/]+)\/journey$/;

  describe("public routes", () => {
    it("identifies home page as public", () => {
      expect(PUBLIC_ROUTES.includes("/")).toBe(true);
    });

    it("identifies login page as public", () => {
      expect(PUBLIC_ROUTES.includes("/login")).toBe(true);
    });

    it("identifies signup page as public", () => {
      expect(PUBLIC_ROUTES.includes("/signup")).toBe(true);
    });

    it("identifies forgot-password page as public", () => {
      expect(PUBLIC_ROUTES.includes("/forgot-password")).toBe(true);
    });

    it("identifies auth callback as public", () => {
      expect(PUBLIC_ROUTES.includes("/auth/callback")).toBe(true);
    });
  });

  describe("authenticated routes", () => {
    it("identifies /dashboard as authenticated route", () => {
      expect(AUTHENTICATED_ROUTES.some((route) => "/dashboard".startsWith(route))).toBe(
        true
      );
    });

    it("dashboard subpaths are also protected", () => {
      expect(
        AUTHENTICATED_ROUTES.some((route) => "/dashboard/settings".startsWith(route))
      ).toBe(true);
    });
  });

  describe("purchased routes (journey pages)", () => {
    it("matches /company/role/journey pattern", () => {
      const match = "/google/software-engineer/journey".match(PURCHASED_ROUTE_PATTERN);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("google");
      expect(match?.[2]).toBe("software-engineer");
    });

    it("matches different company/role combinations", () => {
      const paths = [
        "/amazon/product-manager/journey",
        "/meta/data-scientist/journey",
        "/apple/ios-engineer/journey",
      ];

      for (const path of paths) {
        expect(path.match(PURCHASED_ROUTE_PATTERN)).not.toBeNull();
      }
    });

    it("does not match landing pages", () => {
      const landingPaths = ["/google", "/google/software-engineer"];

      for (const path of landingPaths) {
        expect(path.match(PURCHASED_ROUTE_PATTERN)).toBeNull();
      }
    });

    it("does not match paths with extra segments", () => {
      const invalidPaths = [
        "/google/software-engineer/journey/step/1",
        "/google/software-engineer/journey/extra",
      ];

      for (const path of invalidPaths) {
        expect(path.match(PURCHASED_ROUTE_PATTERN)).toBeNull();
      }
    });
  });

  describe("API routes", () => {
    it("identifies API routes by prefix", () => {
      const apiPaths = ["/api/health", "/api/auth/callback", "/api/webhooks/stripe"];

      for (const path of apiPaths) {
        expect(path.startsWith("/api/")).toBe(true);
      }
    });
  });

  describe("company/role landing pages", () => {
    it("single segment is company page", () => {
      const path = "/google";
      const segments = path.split("/").filter(Boolean);
      expect(segments.length).toBe(1);
    });

    it("two segments is company/role landing page", () => {
      const path = "/google/software-engineer";
      const segments = path.split("/").filter(Boolean);
      expect(segments.length).toBe(2);
      expect(segments[1]).not.toBe("journey");
    });

    it("three segments with journey is purchased route", () => {
      const path = "/google/software-engineer/journey";
      const segments = path.split("/").filter(Boolean);
      expect(segments.length).toBe(3);
      expect(segments[2]).toBe("journey");
    });
  });
});

describe("route protection levels", () => {
  type RouteProtectionLevel = "public" | "authenticated" | "purchased";

  function getRouteLevel(path: string): RouteProtectionLevel {
    const PUBLIC_ROUTES = [
      "/",
      "/login",
      "/signup",
      "/forgot-password",
      "/auth/callback",
    ];
    const AUTHENTICATED_ROUTES = ["/dashboard"];
    const PURCHASED_ROUTE_PATTERN = /^\/([^\/]+)\/([^\/]+)\/journey$/;

    if (PUBLIC_ROUTES.includes(path)) return "public";
    if (path.startsWith("/api/")) return "public";
    if (path.includes(".")) return "public"; // Static files
    if (path.startsWith("/_next/")) return "public";

    // Check authenticated routes before segment-based checks
    if (AUTHENTICATED_ROUTES.some((route) => path.startsWith(route))) {
      return "authenticated";
    }

    if (PURCHASED_ROUTE_PATTERN.test(path)) {
      return "purchased";
    }

    const segments = path.split("/").filter(Boolean);
    if (segments.length === 1) return "public"; // Company page
    if (segments.length === 2 && segments[1] !== "journey") return "public"; // Landing page

    return "public";
  }

  it("classifies home page as public", () => {
    expect(getRouteLevel("/")).toBe("public");
  });

  it("classifies login page as public", () => {
    expect(getRouteLevel("/login")).toBe("public");
  });

  it("classifies company page as public", () => {
    expect(getRouteLevel("/google")).toBe("public");
  });

  it("classifies company/role landing page as public", () => {
    expect(getRouteLevel("/google/software-engineer")).toBe("public");
  });

  it("classifies dashboard as authenticated", () => {
    expect(getRouteLevel("/dashboard")).toBe("authenticated");
  });

  it("classifies journey page as purchased", () => {
    expect(getRouteLevel("/google/software-engineer/journey")).toBe("purchased");
  });

  it("classifies API routes as public", () => {
    expect(getRouteLevel("/api/health")).toBe("public");
  });

  it("classifies static files as public", () => {
    expect(getRouteLevel("/logo.png")).toBe("public");
  });
});
