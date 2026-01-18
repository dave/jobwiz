import { createBrowserClient } from "../client";

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-12345",
};

// Store original env
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, ...mockEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("Supabase browser client", () => {
  test("initializes without error", () => {
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  test("has expected methods", () => {
    const client = createBrowserClient();
    expect(typeof client.from).toBe("function");
    expect(typeof client.auth.getUser).toBe("function");
    expect(typeof client.auth.signInWithPassword).toBe("function");
    expect(typeof client.auth.signInWithOAuth).toBe("function");
  });
});

// Note: Server client tests require actual Next.js server context
// and cannot be unit tested without mocking next/headers cookies()
// Integration tests should verify server client in actual server components
describe("Supabase server client", () => {
  test.todo("initializes without error (requires server context)");
  test.todo("can connect to database (requires real credentials)");
});
