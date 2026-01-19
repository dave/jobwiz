/**
 * Tests for ConversationContext
 * Issue: #184 - 1.3: Conversation context
 */

import { render, screen, act, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { ConversationProvider, useConversation } from "../ConversationContext";
import { CarouselProvider } from "@/components/carousel";
import type { CarouselItem, CarouselOptions, ContentBlock } from "@/types";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock Supabase
const mockSupabaseUser = jest.fn().mockResolvedValue({ data: { user: null } });
const mockSupabaseSelect = jest.fn().mockReturnThis();
const mockSupabaseEq = jest.fn().mockReturnThis();
const mockSupabaseSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockSupabaseUpsert = jest.fn().mockResolvedValue({ error: null });

jest.mock("@/lib/supabase/client", () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getUser: mockSupabaseUser,
    },
    from: jest.fn(() => ({
      select: mockSupabaseSelect,
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
      upsert: mockSupabaseUpsert,
    })),
  })),
}));

// Test data factories
function createContentBlock(
  overrides: Partial<ContentBlock> = {}
): ContentBlock {
  return {
    type: "text",
    id: "block-1",
    content: "Test content",
    ...overrides,
  } as ContentBlock;
}

function createCarouselItem(
  overrides: Partial<CarouselItem> = {}
): CarouselItem {
  return {
    id: "item-1",
    type: "content",
    content: createContentBlock(),
    moduleSlug: "test-module",
    isPremium: false,
    order: 0,
    ...overrides,
  };
}

function createOptions(
  overrides: Partial<CarouselOptions> = {}
): CarouselOptions {
  return {
    companySlug: "test-company",
    roleSlug: "test-role",
    items: [
      createCarouselItem({ id: "item-1", order: 0 }),
      createCarouselItem({ id: "item-2", order: 1, type: "quiz" }),
      createCarouselItem({ id: "item-3", order: 2 }),
    ],
    ...overrides,
  };
}

// Wrapper component for testing hooks
function createWrapper(
  carouselOptions: CarouselOptions,
  enableSupabaseSync = false
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <CarouselProvider options={carouselOptions} enableSupabaseSync={false}>
        <ConversationProvider enableSupabaseSync={enableSupabaseSync}>
          {children}
        </ConversationProvider>
      </CarouselProvider>
    );
  };
}

describe("ConversationProvider", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    mockSupabaseUser.mockResolvedValue({ data: { user: null } });
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null });
  });

  describe("initialization", () => {
    test("initializes with empty messages", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.messages).toEqual([]);
    });

    test("initializes with empty answers", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.answers).toEqual({});
    });

    test("initializes with default display mode 'big-question'", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.displayMode).toBe("big-question");
    });

    test("initializes with custom display mode", () => {
      const options = createOptions();
      const wrapper = function Wrapper({
        children,
      }: {
        children: React.ReactNode;
      }) {
        return (
          <CarouselProvider options={options} enableSupabaseSync={false}>
            <ConversationProvider
              initialDisplayMode="conversational"
              enableSupabaseSync={false}
            >
              {children}
            </ConversationProvider>
          </CarouselProvider>
        );
      };
      const { result } = renderHook(() => useConversation(), {
        wrapper,
      });

      expect(result.current.displayMode).toBe("conversational");
    });
  });

  describe("addMessage", () => {
    test("adds an alex message", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.addMessage("alex", "Hello!", "item-1");
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]?.sender).toBe("alex");
      expect(result.current.messages[0]?.content).toBe("Hello!");
      expect(result.current.messages[0]?.itemId).toBe("item-1");
    });

    test("adds a user message", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.addMessage("user", "Hi there!", "item-1");
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]?.sender).toBe("user");
      expect(result.current.messages[0]?.content).toBe("Hi there!");
    });

    test("returns message id", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      let messageId: string = "";
      act(() => {
        messageId = result.current.addMessage("alex", "Test", "item-1");
      });

      expect(messageId).toMatch(/^msg-\d+-\w+$/);
      expect(result.current.messages[0]?.id).toBe(messageId);
    });

    test("adds timestamp to message", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      const before = Date.now();
      act(() => {
        result.current.addMessage("alex", "Test", "item-1");
      });
      const after = Date.now();

      const timestamp = result.current.messages[0]?.timestamp ?? 0;
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test("preserves existing messages when adding new one", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.addMessage("alex", "First", "item-1");
      });
      act(() => {
        result.current.addMessage("user", "Second", "item-1");
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]?.content).toBe("First");
      expect(result.current.messages[1]?.content).toBe("Second");
    });
  });

  describe("recordAnswer", () => {
    test("records answer with selectedIds", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a", "option-b"]);
      });

      expect(result.current.answers["item-2"]).toBeDefined();
      expect(result.current.answers["item-2"]?.selectedIds).toEqual([
        "option-a",
        "option-b",
      ]);
    });

    test("records answer with isCorrect flag", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a"], true);
      });

      expect(result.current.answers["item-2"]?.isCorrect).toBe(true);
    });

    test("records answer with timestamp", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      const before = Date.now();
      act(() => {
        result.current.recordAnswer("item-2", ["option-a"]);
      });
      const after = Date.now();

      const timestamp = result.current.answers["item-2"]?.timestamp ?? 0;
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test("overwrites previous answer for same item", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a"], false);
      });
      act(() => {
        result.current.recordAnswer("item-2", ["option-b"], true);
      });

      expect(result.current.answers["item-2"]?.selectedIds).toEqual([
        "option-b",
      ]);
      expect(result.current.answers["item-2"]?.isCorrect).toBe(true);
    });
  });

  describe("getAnswer", () => {
    test("returns answer for item with answer", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a"], true);
      });

      const answer = result.current.getAnswer("item-2");
      expect(answer).toBeDefined();
      expect(answer?.selectedIds).toEqual(["option-a"]);
      expect(answer?.isCorrect).toBe(true);
    });

    test("returns undefined for item without answer", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      const answer = result.current.getAnswer("item-99");
      expect(answer).toBeUndefined();
    });
  });

  describe("hasAnswer", () => {
    test("returns true for item with answer", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a"]);
      });

      expect(result.current.hasAnswer("item-2")).toBe(true);
    });

    test("returns false for item without answer", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.hasAnswer("item-99")).toBe(false);
    });
  });

  describe("setDisplayMode", () => {
    test("changes display mode to conversational", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.displayMode).toBe("big-question");

      act(() => {
        result.current.setDisplayMode("conversational");
      });

      expect(result.current.displayMode).toBe("conversational");
    });

    test("changes display mode to big-question", () => {
      const options = createOptions();
      const wrapper = function Wrapper({
        children,
      }: {
        children: React.ReactNode;
      }) {
        return (
          <CarouselProvider options={options} enableSupabaseSync={false}>
            <ConversationProvider
              initialDisplayMode="conversational"
              enableSupabaseSync={false}
            >
              {children}
            </ConversationProvider>
          </CarouselProvider>
        );
      };
      const { result } = renderHook(() => useConversation(), {
        wrapper,
      });

      expect(result.current.displayMode).toBe("conversational");

      act(() => {
        result.current.setDisplayMode("big-question");
      });

      expect(result.current.displayMode).toBe("big-question");
    });
  });

  describe("clearMessages", () => {
    test("clears all messages", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.addMessage("alex", "First", "item-1");
        result.current.addMessage("user", "Second", "item-1");
      });

      expect(result.current.messages).toHaveLength(2);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
    });

    test("does not clear answers", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.addMessage("alex", "Question", "item-2");
        result.current.recordAnswer("item-2", ["option-a"]);
      });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.hasAnswer("item-2")).toBe(true);
    });
  });

  describe("localStorage persistence", () => {
    test("persists answers to localStorage", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a"], true);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      // Find the conversation key (not carousel key)
      const conversationCalls = mockLocalStorage.setItem.mock.calls.filter(
        (call: [string, string]) => call[0].startsWith("conversation-")
      );
      expect(conversationCalls.length).toBeGreaterThan(0);
      expect(conversationCalls[0]?.[0]).toContain("conversation-test-company-test-role");
    });

    test("loads answers from localStorage on init", () => {
      const options = createOptions();

      // Pre-populate localStorage
      const stored = {
        answers: {
          "item-2": {
            selectedIds: ["option-b"],
            isCorrect: true,
            timestamp: 12345,
          },
        },
        lastUpdated: 12345,
      };
      mockLocalStorage.store["conversation-test-company-test-role"] =
        JSON.stringify(stored);

      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      expect(result.current.hasAnswer("item-2")).toBe(true);
      expect(result.current.getAnswer("item-2")?.selectedIds).toEqual([
        "option-b",
      ]);
    });

    test("does not persist messages (session only)", () => {
      const options = createOptions();
      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.addMessage("alex", "Hello", "item-1");
      });

      // Check that localStorage set was called (for answers, not messages)
      // Since we haven't recorded any answer yet, we should not have persisted
      const calls = mockLocalStorage.setItem.mock.calls;
      const conversationCalls = calls.filter((call: [string, string]) =>
        call[0].includes("conversation-")
      );

      // Messages should not trigger persistence (only answers do)
      if (conversationCalls.length > 0) {
        const firstCall = conversationCalls[0];
        if (firstCall) {
          const stored = JSON.parse(firstCall[1]);
          expect(stored.messages).toBeUndefined(); // No messages in persisted data
        }
      }
    });
  });

  describe("Supabase sync", () => {
    test("loads answers from Supabase when logged in", async () => {
      const options = createOptions();

      // Mock authenticated user
      mockSupabaseUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      // Mock Supabase response with saved answers
      mockSupabaseSingle.mockResolvedValue({
        data: {
          answers: [
            {
              questionId: "item-2",
              answer: { selectedIds: ["option-remote"], isCorrect: true },
              timestamp: 99999,
            },
          ],
          last_updated: new Date(99999).toISOString(),
        },
        error: null,
      });

      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options, true), // Enable Supabase sync
      });

      // Wait for async load
      await waitFor(() => {
        expect(result.current.hasAnswer("item-2")).toBe(true);
      });

      expect(result.current.getAnswer("item-2")?.selectedIds).toEqual([
        "option-remote",
      ]);
    });

    test("saves answers to Supabase when logged in", async () => {
      jest.useFakeTimers();
      const options = createOptions();

      // Mock authenticated user
      mockSupabaseUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
      });

      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options, true), // Enable Supabase sync
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a"], true);
      });

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      // Wait for async save
      await waitFor(() => {
        expect(mockSupabaseUpsert).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    test("does not save to Supabase when not logged in", async () => {
      jest.useFakeTimers();
      const options = createOptions();

      // Mock unauthenticated user
      mockSupabaseUser.mockResolvedValue({ data: { user: null } });

      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options, true), // Enable Supabase sync
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a"], true);
      });

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      // Upsert should not be called for unauthenticated user
      expect(mockSupabaseUpsert).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe("useConversation hook", () => {
    test("throws error when used outside ConversationProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      expect(() => {
        renderHook(() => useConversation());
      }).toThrow("useConversation must be used within a ConversationProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("integration with CarouselContext", () => {
    test("ConversationProvider requires CarouselProvider parent", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      expect(() => {
        render(
          <ConversationProvider>
            <div>Test</div>
          </ConversationProvider>
        );
      }).toThrow();

      consoleSpy.mockRestore();
    });

    test("uses carousel company and role for storage key", () => {
      const options = createOptions({
        companySlug: "custom-company",
        roleSlug: "custom-role",
      });

      const { result } = renderHook(() => useConversation(), {
        wrapper: createWrapper(options),
      });

      act(() => {
        result.current.recordAnswer("item-2", ["option-a"]);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      // Find the conversation key (not carousel key)
      const conversationCalls = mockLocalStorage.setItem.mock.calls.filter(
        (call: [string, string]) => call[0].startsWith("conversation-")
      );
      expect(conversationCalls.length).toBeGreaterThan(0);
      expect(conversationCalls[0]?.[0]).toContain("conversation-custom-company-custom-role");
    });
  });

  describe("rendering", () => {
    test("renders children", () => {
      const options = createOptions();

      render(
        <CarouselProvider options={options} enableSupabaseSync={false}>
          <ConversationProvider enableSupabaseSync={false}>
            <div data-testid="child">Child content</div>
          </ConversationProvider>
        </CarouselProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Child content")).toBeInTheDocument();
    });
  });
});
