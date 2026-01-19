import { render, screen, fireEvent, act } from "@testing-library/react";
import { SectionTimeline, type TimelineSection } from "../SectionTimeline";
import type { CarouselContextValue, CarouselItem, ContentBlock } from "@/types";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...props}>{children}</div>
    ),
    aside: ({ children, ...props }: React.ComponentProps<"aside">) => (
      <aside {...props}>{children}</aside>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useReducedMotion: () => false,
}));

// Mock carousel context
const mockGoTo = jest.fn();
const mockCarouselContext: CarouselContextValue = {
  state: {
    currentIndex: 0,
    items: [],
    isPaused: false,
    paywallIndex: null,
    hasPremiumAccess: false,
    completedItems: new Set<string>(),
    lastDirection: null,
  },
  currentItem: null,
  progress: 0,
  totalItems: 0,
  completedCount: 0,
  isFirstItem: true,
  isLastItem: false,
  isAtPaywall: false,
  companySlug: "google",
  roleSlug: "software-engineer",
  next: jest.fn(),
  prev: jest.fn(),
  goTo: mockGoTo,
  pause: jest.fn(),
  resume: jest.fn(),
  markComplete: jest.fn(),
  unlockPaywall: jest.fn(),
  canGoNext: true,
  canGoPrev: false,
};

// Mock useCarousel hook
jest.mock("@/components/carousel", () => ({
  useCarousel: () => mockCarouselContext,
}));

// Helper to create mock carousel items
function createMockItem(
  id: string,
  moduleSlug: string,
  sectionTitle?: string,
  type: "content" | "quiz" | "checklist" | "paywall" = "content"
): CarouselItem {
  return {
    id,
    type,
    moduleSlug,
    sectionTitle,
    isPremium: false,
    order: 0,
    content: {
      id: `block-${id}`,
      type: "text",
      content: "Test content",
    } as ContentBlock,
  };
}

describe("SectionTimeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCarouselContext.state.items = [];
    mockCarouselContext.state.currentIndex = 0;
    mockCarouselContext.state.completedItems = new Set();
  });

  describe("Rendering", () => {
    it("renders desktop sidebar with correct aria-label", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline data-testid="timeline" />);

      const sidebar = screen.getByTestId("timeline");
      expect(sidebar).toHaveAttribute("aria-label", "Journey progress");
    });

    it("renders mobile toggle button", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      const toggle = screen.getByTestId("timeline-toggle");
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-label", "Open progress menu");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("renders progress percentage", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Section 1"),
        createMockItem("item-2", "basics", "Section 2"),
      ];
      mockCarouselContext.state.completedItems = new Set(["item-1"]);

      render(<SectionTimeline />);

      // 1 of 2 sections completed = 50%
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("renders 'Your Progress' label", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      expect(screen.getByText("Your Progress")).toBeInTheDocument();
    });
  });

  describe("Section Extraction", () => {
    it("groups items by sectionTitle", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "module-a", "Getting Started"),
        createMockItem("item-2", "module-a", "Getting Started"),
        createMockItem("item-3", "module-b", "Deep Dive"),
      ];

      render(<SectionTimeline />);

      // Should show 2 sections: "Getting Started" and "Deep Dive"
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("Deep Dive")).toBeInTheDocument();
    });

    it("uses moduleSlug as fallback when sectionTitle is missing", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "company-google"),
      ];

      render(<SectionTimeline />);

      // Should format "company-google" as "Company Google"
      expect(screen.getByText("Company Google")).toBeInTheDocument();
    });

    it("skips paywall items in section grouping", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("paywall-1", "paywall", "Paywall", "paywall"),
        createMockItem("item-2", "premium", "Premium Content"),
      ];

      render(<SectionTimeline />);

      // Should show 2 sections, not 3 (paywall excluded)
      expect(screen.getByText("Introduction")).toBeInTheDocument();
      expect(screen.getByText("Premium Content")).toBeInTheDocument();
      expect(screen.queryByText("Paywall")).not.toBeInTheDocument();
    });
  });

  describe("Section States", () => {
    it("shows checkmark for completed sections", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("item-2", "basics", "Basics"),
      ];
      mockCarouselContext.state.currentIndex = 1;
      mockCarouselContext.state.completedItems = new Set(["item-1"]);

      render(<SectionTimeline />);

      // The completed section should have a checkmark (SVG with path)
      const introButton = screen.getByTestId("section-Introduction");
      expect(introButton.querySelector("svg")).toBeInTheDocument();
    });

    it("highlights current section", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("item-2", "basics", "Basics"),
      ];
      mockCarouselContext.state.currentIndex = 1;

      render(<SectionTimeline />);

      const basicsButton = screen.getByTestId("section-Basics");
      expect(basicsButton).toHaveAttribute("aria-current", "step");
    });

    it("applies correct aria-label for section states", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("item-2", "basics", "Basics"),
        createMockItem("item-3", "advanced", "Advanced"),
      ];
      mockCarouselContext.state.currentIndex = 1;
      mockCarouselContext.state.completedItems = new Set(["item-1"]);

      render(<SectionTimeline />);

      expect(screen.getByTestId("section-Introduction")).toHaveAttribute(
        "aria-label",
        "Introduction (completed)"
      );
      expect(screen.getByTestId("section-Basics")).toHaveAttribute(
        "aria-label",
        "Basics (current)"
      );
      expect(screen.getByTestId("section-Advanced")).toHaveAttribute(
        "aria-label",
        "Advanced"
      );
    });
  });

  describe("Click to Jump", () => {
    it("calls goTo with correct index when clicking completed section", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("item-2", "basics", "Basics"),
      ];
      mockCarouselContext.state.currentIndex = 1;
      mockCarouselContext.state.completedItems = new Set(["item-1"]);

      render(<SectionTimeline />);

      fireEvent.click(screen.getByTestId("section-Introduction"));

      expect(mockGoTo).toHaveBeenCalledWith(0); // startIndex of Introduction
    });

    it("calls onSectionClick callback when section is clicked", () => {
      const onSectionClick = jest.fn();
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("item-2", "basics", "Basics"),
      ];
      mockCarouselContext.state.currentIndex = 1;
      mockCarouselContext.state.completedItems = new Set(["item-1"]);

      render(<SectionTimeline onSectionClick={onSectionClick} />);

      fireEvent.click(screen.getByTestId("section-Introduction"));

      expect(onSectionClick).toHaveBeenCalledWith("Introduction", 0);
    });

    it("disables clicking on future sections", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("item-2", "basics", "Basics"),
        createMockItem("item-3", "advanced", "Advanced"),
      ];
      mockCarouselContext.state.currentIndex = 1;
      mockCarouselContext.state.completedItems = new Set(["item-1"]);

      render(<SectionTimeline />);

      const advancedButton = screen.getByTestId("section-Advanced");
      expect(advancedButton).toBeDisabled();
    });

    it("allows clicking on current section", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("item-2", "basics", "Basics"),
      ];
      mockCarouselContext.state.currentIndex = 1;

      render(<SectionTimeline />);

      fireEvent.click(screen.getByTestId("section-Basics"));

      expect(mockGoTo).toHaveBeenCalledWith(1);
    });
  });

  describe("Mobile Drawer", () => {
    it("opens drawer when toggle button is clicked", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      // Drawer should not be visible initially
      expect(screen.queryByTestId("timeline-drawer")).not.toBeInTheDocument();

      // Click toggle button
      fireEvent.click(screen.getByTestId("timeline-toggle"));

      // Drawer should be visible
      expect(screen.getByTestId("timeline-drawer")).toBeInTheDocument();
    });

    it("closes drawer when close button is clicked", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      // Open drawer
      fireEvent.click(screen.getByTestId("timeline-toggle"));
      expect(screen.getByTestId("timeline-drawer")).toBeInTheDocument();

      // Close drawer
      fireEvent.click(screen.getByTestId("drawer-close"));

      // Drawer should be hidden
      expect(screen.queryByTestId("timeline-drawer")).not.toBeInTheDocument();
    });

    it("closes drawer when backdrop is clicked", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      // Open drawer
      fireEvent.click(screen.getByTestId("timeline-toggle"));
      expect(screen.getByTestId("timeline-drawer")).toBeInTheDocument();

      // Click backdrop
      fireEvent.click(screen.getByTestId("drawer-backdrop"));

      // Drawer should be hidden
      expect(screen.queryByTestId("timeline-drawer")).not.toBeInTheDocument();
    });

    it("closes drawer on Escape key", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      // Open drawer
      fireEvent.click(screen.getByTestId("timeline-toggle"));
      expect(screen.getByTestId("timeline-drawer")).toBeInTheDocument();

      // Press Escape
      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      // Drawer should be hidden
      expect(screen.queryByTestId("timeline-drawer")).not.toBeInTheDocument();
    });

    it("closes drawer after section selection", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
        createMockItem("item-2", "basics", "Basics"),
      ];
      mockCarouselContext.state.currentIndex = 1;
      mockCarouselContext.state.completedItems = new Set(["item-1"]);

      render(<SectionTimeline />);

      // Open drawer
      fireEvent.click(screen.getByTestId("timeline-toggle"));
      const drawer = screen.getByTestId("timeline-drawer");
      expect(drawer).toBeInTheDocument();

      // Click a section within the drawer
      const sectionInDrawer = drawer.querySelector(
        '[data-testid="section-Introduction"]'
      );
      expect(sectionInDrawer).not.toBeNull();
      fireEvent.click(sectionInDrawer!);

      // Drawer should close
      expect(screen.queryByTestId("timeline-drawer")).not.toBeInTheDocument();
    });

    it("has correct aria attributes on drawer", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      // Open drawer
      fireEvent.click(screen.getByTestId("timeline-toggle"));

      const drawer = screen.getByTestId("timeline-drawer");
      expect(drawer).toHaveAttribute("role", "dialog");
      expect(drawer).toHaveAttribute("aria-modal", "true");
      expect(drawer).toHaveAttribute("aria-label", "Journey progress");
    });
  });

  describe("Accessibility", () => {
    it("sections nav has correct aria-label", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      expect(
        screen.getByRole("navigation", { name: "Journey sections" })
      ).toBeInTheDocument();
    });

    it("toggle button updates aria-expanded when drawer opens", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      const toggle = screen.getByTestId("timeline-toggle");
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("Progress Calculation", () => {
    it("calculates 0% progress when no sections completed", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Section 1"),
        createMockItem("item-2", "basics", "Section 2"),
      ];
      mockCarouselContext.state.completedItems = new Set();

      render(<SectionTimeline />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("calculates 100% progress when all sections completed", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Section 1"),
        createMockItem("item-2", "basics", "Section 2"),
      ];
      mockCarouselContext.state.completedItems = new Set(["item-1", "item-2"]);

      render(<SectionTimeline />);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("handles sections with multiple items correctly", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Section 1"),
        createMockItem("item-2", "intro", "Section 1"), // Same section
        createMockItem("item-3", "basics", "Section 2"),
      ];
      // Complete only first item of Section 1 (section not complete)
      mockCarouselContext.state.completedItems = new Set(["item-1"]);

      render(<SectionTimeline />);

      // Section 1 has 2 items, only 1 completed, so section not complete
      // 0 of 2 sections complete = 0%
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("marks section complete when all items in section completed", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Section 1"),
        createMockItem("item-2", "intro", "Section 1"), // Same section
        createMockItem("item-3", "basics", "Section 2"),
      ];
      // Complete all items in Section 1
      mockCarouselContext.state.completedItems = new Set(["item-1", "item-2"]);
      mockCarouselContext.state.currentIndex = 2;

      render(<SectionTimeline />);

      // 1 of 2 sections complete = 50%
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("desktop sidebar has hidden lg:flex classes", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline data-testid="timeline" />);

      const sidebar = screen.getByTestId("timeline");
      expect(sidebar.className).toContain("hidden");
      expect(sidebar.className).toContain("lg:flex");
    });

    it("mobile toggle has lg:hidden class", () => {
      mockCarouselContext.state.items = [
        createMockItem("item-1", "intro", "Introduction"),
      ];

      render(<SectionTimeline />);

      const toggle = screen.getByTestId("timeline-toggle");
      expect(toggle.className).toContain("lg:hidden");
    });
  });
});
