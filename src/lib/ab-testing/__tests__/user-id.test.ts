/**
 * User ID Tests
 * Issue: #41 - User bucketing system
 */

import {
  generateUUID,
  isValidUUID,
  parseCookies,
  getUserId,
  getUserIdFromRequest,
  getUserIdCookieOptions,
  formatCookieHeader,
  USER_ID_COOKIE_NAME,
  USER_ID_COOKIE_EXPIRY_SECONDS,
} from "../user-id";

describe("generateUUID", () => {
  test("generates valid UUID v4 format", () => {
    const uuid = generateUUID();
    expect(isValidUUID(uuid)).toBe(true);
  });

  test("generates unique UUIDs", () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID());
    }
    expect(uuids.size).toBe(100);
  });

  test("generates 36-character string", () => {
    const uuid = generateUUID();
    expect(uuid).toHaveLength(36);
  });

  test("has correct hyphen positions", () => {
    const uuid = generateUUID();
    expect(uuid[8]).toBe("-");
    expect(uuid[13]).toBe("-");
    expect(uuid[18]).toBe("-");
    expect(uuid[23]).toBe("-");
  });

  test("has version 4 indicator", () => {
    const uuid = generateUUID();
    // Position 14 (after second hyphen) should be 4
    expect(uuid[14]).toBe("4");
  });

  test("has correct variant bits", () => {
    const uuid = generateUUID();
    // Position 19 (after third hyphen) should be 8, 9, a, or b
    expect(["8", "9", "a", "b"]).toContain(uuid[19]);
  });
});

describe("isValidUUID", () => {
  test("returns true for valid UUID v4", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
  });

  test("returns false for invalid formats", () => {
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("12345678-1234-1234-1234-123456789012")).toBe(false); // Not v4
    expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false); // Too short
    expect(isValidUUID("550e8400e29b41d4a716446655440000")).toBe(false); // No hyphens
  });

  test("is case insensitive", () => {
    expect(isValidUUID("F47AC10B-58CC-4372-A567-0E02B2C3D479")).toBe(true);
    expect(isValidUUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
  });

  test("rejects UUIDs with wrong version", () => {
    // Version 1
    expect(isValidUUID("550e8400-e29b-11d4-a716-446655440000")).toBe(false);
    // Version 5
    expect(isValidUUID("550e8400-e29b-51d4-a716-446655440000")).toBe(false);
  });
});

describe("parseCookies", () => {
  test("parses single cookie", () => {
    const cookies = parseCookies("name=value");
    expect(cookies).toEqual({ name: "value" });
  });

  test("parses multiple cookies", () => {
    const cookies = parseCookies("a=1; b=2; c=3");
    expect(cookies).toEqual({ a: "1", b: "2", c: "3" });
  });

  test("handles URL-encoded values", () => {
    const cookies = parseCookies("encoded=hello%20world");
    expect(cookies.encoded).toBe("hello world");
  });

  test("handles empty string", () => {
    const cookies = parseCookies("");
    expect(cookies).toEqual({});
  });

  test("handles cookies with = in value", () => {
    const cookies = parseCookies("data=a=b=c");
    expect(cookies.data).toBe("a=b=c");
  });

  test("trims whitespace", () => {
    const cookies = parseCookies("  name  =  value  ");
    expect(cookies.name).toBe("value");
  });

  test("handles missing value", () => {
    const cookies = parseCookies("name=");
    expect(cookies.name).toBe("");
  });
});

describe("getUserId", () => {
  test("returns auth user ID when provided", () => {
    const result = getUserId("auth-user-123");
    expect(result.userId).toBe("auth-user-123");
    expect(result.source).toBe("auth");
  });

  test("returns source as auth for logged in users", () => {
    const result = getUserId("supabase-user-id");
    expect(result.source).toBe("auth");
  });

  test("handles null auth user ID", () => {
    // In browser environment, this would check cookies
    // In test environment, it generates a new ID
    const result = getUserId(null);
    expect(result.userId).toBeTruthy();
    expect(result.source).not.toBe("auth");
  });

  test("handles undefined auth user ID", () => {
    const result = getUserId(undefined);
    expect(result.userId).toBeTruthy();
    expect(result.source).not.toBe("auth");
  });
});

describe("getUserIdFromRequest", () => {
  test("extracts user ID from cookie string", () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";
    const cookieString = `${USER_ID_COOKIE_NAME}=${validUUID}; other=value`;

    const userId = getUserIdFromRequest(cookieString);
    expect(userId).toBe(validUUID);
  });

  test("returns null for missing cookie", () => {
    const userId = getUserIdFromRequest("other=value; another=test");
    expect(userId).toBeNull();
  });

  test("returns null for invalid UUID in cookie", () => {
    const cookieString = `${USER_ID_COOKIE_NAME}=not-a-uuid`;
    const userId = getUserIdFromRequest(cookieString);
    expect(userId).toBeNull();
  });

  test("returns null for null cookie string", () => {
    const userId = getUserIdFromRequest(null);
    expect(userId).toBeNull();
  });

  test("returns null for empty cookie string", () => {
    const userId = getUserIdFromRequest("");
    expect(userId).toBeNull();
  });
});

describe("getUserIdCookieOptions", () => {
  test("returns correct cookie options", () => {
    const userId = "test-user-123";
    const options = getUserIdCookieOptions(userId);

    expect(options.name).toBe(USER_ID_COOKIE_NAME);
    expect(options.value).toBe(userId);
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(USER_ID_COOKIE_EXPIRY_SECONDS);
    expect(options.sameSite).toBe("Lax");
    expect(options.httpOnly).toBe(false);
    expect(options.secure).toBe(true);
  });

  test("respects secure parameter", () => {
    const options = getUserIdCookieOptions("user-123", false);
    expect(options.secure).toBe(false);
  });
});

describe("formatCookieHeader", () => {
  test("formats cookie options as header string", () => {
    const options = {
      name: "test",
      value: "value",
      path: "/",
      maxAge: 3600,
      sameSite: "Lax" as const,
      httpOnly: false,
      secure: true,
    };

    const header = formatCookieHeader(options);

    expect(header).toContain("test=value");
    expect(header).toContain("Path=/");
    expect(header).toContain("Max-Age=3600");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
    expect(header).not.toContain("HttpOnly");
  });

  test("includes HttpOnly when set", () => {
    const options = {
      name: "test",
      value: "value",
      path: "/",
      maxAge: 3600,
      sameSite: "Lax" as const,
      httpOnly: true,
      secure: false,
    };

    const header = formatCookieHeader(options);

    expect(header).toContain("HttpOnly");
    expect(header).not.toContain("Secure");
  });

  test("encodes special characters in value", () => {
    const options = {
      name: "test",
      value: "hello world=test",
      path: "/",
      maxAge: 3600,
      sameSite: "Lax" as const,
      httpOnly: false,
      secure: false,
    };

    const header = formatCookieHeader(options);

    expect(header).toContain("test=hello%20world%3Dtest");
  });
});

describe("USER_ID_COOKIE_NAME", () => {
  test("is jw_uid", () => {
    expect(USER_ID_COOKIE_NAME).toBe("jw_uid");
  });
});

describe("USER_ID_COOKIE_EXPIRY_SECONDS", () => {
  test("is 1 year in seconds", () => {
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    expect(USER_ID_COOKIE_EXPIRY_SECONDS).toBe(oneYearInSeconds);
  });
});
