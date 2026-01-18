/**
 * Tests for auth hooks
 * Issue: #57 - Protected route middleware
 */

import React from "react";
import { renderHook } from "@testing-library/react";
import { AuthProvider } from "../context";
import { useAuth, useAccess, useRequireAuth } from "../hooks";

// Mock Next.js router
const mockPush = jest.fn();
const mockUsePathname = jest.fn().mockReturnValue("/dashboard");

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockUsePathname(),
}));

// Mock the Supabase client
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: mockGetSession,
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  }),
}));

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
  });

  it("returns auth state from context", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: { full_name: "Test User" },
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user?.id).toBe("user-123");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns null user when not authenticated", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={null}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it("includes session in returned state", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "my-token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.session?.access_token).toBe("my-token");
  });

  it("returns loading state correctly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Without initial session, should be loading
    expect(result.current.loading).toBe(true);
  });
});

describe("useAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });

    // Default: no access grants
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });
  });

  it("returns initial loading state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={null}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAccess("google", "software-engineer"), {
      wrapper,
    });

    expect(result.current.loading).toBe(true);
  });

  it("returns hasAccess as false by default", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={null}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAccess("google", "software-engineer"), {
      wrapper,
    });

    expect(result.current.hasAccess).toBe(false);
  });

  it("accepts company and role parameters", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={null}>{children}</AuthProvider>
    );

    // Should not throw
    const { result } = renderHook(
      () => useAccess("google", "software-engineer"),
      { wrapper }
    );

    expect(result.current).toBeDefined();
  });

  it("returns error state type correctly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={null}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAccess("google", "software-engineer"), {
      wrapper,
    });

    expect(result.current.error).toBeNull();
  });

  it("has correct structure in returned state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={null}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAccess("google", "software-engineer"), {
      wrapper,
    });

    // Should have the expected state properties
    expect(result.current).toHaveProperty("hasAccess");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
  });
});

describe("useRequireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
  });

  it("returns auth state from context", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequireAuth(), { wrapper });

    expect(result.current.user?.id).toBe("user-123");
  });

  it("returns loading state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequireAuth(), { wrapper });

    // Should start as loading
    expect(typeof result.current.loading).toBe("boolean");
  });

  it("accepts optional redirectTo parameter", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    // Should not throw with redirect parameter
    const { result } = renderHook(() => useRequireAuth("/custom-redirect"), {
      wrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("includes error in returned state", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequireAuth(), { wrapper });

    expect(result.current.error).toBeNull();
  });

  it("includes session in returned state", () => {
    const initialSession = {
      user: {
        id: "user-123",
        email: "test@example.com",
        user_metadata: {},
        app_metadata: {},
        aud: "authenticated",
        created_at: "2024-01-01",
      },
      access_token: "my-token",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider initialSession={initialSession as any}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useRequireAuth(), { wrapper });

    expect(result.current.session?.access_token).toBe("my-token");
  });
});
