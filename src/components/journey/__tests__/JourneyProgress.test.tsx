/**
 * Tests for JourneyProgress component
 * Issue: #136 - C4: Journey progress display
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { JourneyProgress, type JourneyProgressProps } from "../JourneyProgress";
import type { Module } from "@/types/module";
import type { CarouselProgress } from "@/types/carousel";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Sample module data for testing
const createMockModule = (
  params: {
    slug: string;
    title: string;
    type?: Module["type"];
    description?: string;
    sections?: Module["sections"];
    isPremium?: boolean;
    order?: number;
    companySlug?: string;
    roleSlug?: string;
  }
): Module => ({
  id: params.slug,
  slug: params.slug,
  type: params.type || "universal",
  title: params.title,
  description: params.description,
  sections: params.sections || [
    {
      id: "section-1",
      title: "Section 1",
      blocks: [
        { id: "block-1", type: "text", content: "Test content" },
        { id: "block-2", type: "text", content: "More content" },
      ],
    },
  ],
  isPremium: params.isPremium ?? false,
  order: params.order ?? 0,
  companySlug: params.companySlug,
  roleSlug: params.roleSlug,
});

const universalModule = createMockModule({
  slug: "universal-interview-basics",
  title: "Interview Basics",
  type: "universal",
  isPremium: false,
});

const companyModule = createMockModule({
  slug: "company-google",
  title: "Google Culture & Values",
  type: "company",
  isPremium: true,
  companySlug: "google",
});

const roleModule = createMockModule({
  slug: "role-software-engineer",
  title: "Software Engineer Prep",
  type: "role",
  isPremium: true,
  roleSlug: "software-engineer",
});

const companyRoleModule = createMockModule({
  slug: "company-role-google-software-engineer",
  title: "Google SWE Interview Questions",
  type: "company-role",
  isPremium: true,
  companySlug: "google",
  roleSlug: "software-engineer",
});

const defaultProps: JourneyProgressProps = {
  companySlug: "google",
  roleSlug: "software-engineer",
  companyName: "Google",
  roleName: "Software Engineer",
  allModules: [universalModule, companyModule, roleModule, companyRoleModule],
  totalItems: 16, // 4 modules * (1 title + 2 blocks + 1 for paywall)
  paywallIndex: 4, // After first module (1 title + 2 blocks = 3 items)
  hasPremiumAccess: false,
  progress: null,
};

describe("JourneyProgress", () => {
  describe("Rendering", () => {
    it("renders the progress card", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByTestId("journey-progress-card")).toBeInTheDocument();
      expect(screen.getByText("Your Progress")).toBeInTheDocument();
    });

    it("renders the module list", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByTestId("module-list")).toBeInTheDocument();
      expect(screen.getByText("Journey Modules")).toBeInTheDocument();
    });

    it("renders all module items", () => {
      render(<JourneyProgress {...defaultProps} />);

      // Use getAllByText since module titles appear in multiple places
      expect(screen.getAllByText("Interview Basics").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Google Culture & Values").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Software Engineer Prep").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Google SWE Interview Questions").length).toBeGreaterThan(0);
    });
  });

  describe("Progress Percentage", () => {
    it("shows 0% when no progress", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByTestId("progress-percentage")).toHaveTextContent("0%");
    });

    it("calculates correct percentage from completed items", () => {
      const progress: CarouselProgress = {
        companySlug: "google",
        roleSlug: "software-engineer",
        currentIndex: 4,
        completedItems: ["item-1", "item-2", "item-3", "item-4"],
        lastUpdated: Date.now(),
      };

      render(
        <JourneyProgress {...defaultProps} totalItems={8} progress={progress} />
      );

      expect(screen.getByTestId("progress-percentage")).toHaveTextContent("50%");
    });

    it("shows 100% when all items completed", () => {
      const progress: CarouselProgress = {
        companySlug: "google",
        roleSlug: "software-engineer",
        currentIndex: 8,
        completedItems: Array.from({ length: 8 }, (_, i) => `item-${i}`),
        lastUpdated: Date.now(),
      };

      render(
        <JourneyProgress {...defaultProps} totalItems={8} progress={progress} />
      );

      expect(screen.getByTestId("progress-percentage")).toHaveTextContent("100%");
    });
  });

  describe("Current Module Display", () => {
    it("shows first module as current when starting", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByTestId("current-module-name")).toHaveTextContent(
        "Interview Basics"
      );
    });

    it("shows correct current module based on progress index", () => {
      const progress: CarouselProgress = {
        companySlug: "google",
        roleSlug: "software-engineer",
        currentIndex: 5, // Past first module (3 items), into second
        completedItems: [],
        lastUpdated: Date.now(),
      };

      render(
        <JourneyProgress
          {...defaultProps}
          hasPremiumAccess={true}
          progress={progress}
        />
      );

      // Should show second module as current
      const currentIndicators = screen.getAllByText("Current");
      expect(currentIndicators.length).toBeGreaterThan(0);
    });
  });

  describe("Continue Button", () => {
    it("shows 'Start Journey' when no progress", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByTestId("continue-button")).toHaveTextContent(
        "Start Journey"
      );
    });

    it("shows 'Continue' when has progress", () => {
      const progress: CarouselProgress = {
        companySlug: "google",
        roleSlug: "software-engineer",
        currentIndex: 2,
        completedItems: ["item-1"],
        lastUpdated: Date.now(),
      };

      render(<JourneyProgress {...defaultProps} progress={progress} />);

      expect(screen.getByTestId("continue-button")).toHaveTextContent(
        "Continue"
      );
    });

    it("shows 'Review Journey' when 100% complete", () => {
      const progress: CarouselProgress = {
        companySlug: "google",
        roleSlug: "software-engineer",
        currentIndex: 16,
        completedItems: Array.from({ length: 16 }, (_, i) => `item-${i}`),
        lastUpdated: Date.now(),
      };

      render(<JourneyProgress {...defaultProps} progress={progress} />);

      expect(screen.getByTestId("continue-button")).toHaveTextContent(
        "Review Journey"
      );
    });

    it("links to learn page with correct URL", () => {
      render(<JourneyProgress {...defaultProps} />);

      const continueButton = screen.getByTestId("continue-button");
      expect(continueButton).toHaveAttribute(
        "href",
        "/google/software-engineer/journey/learn"
      );
    });
  });

  describe("Lock Icons", () => {
    it("shows lock icons for premium modules when user has no access", () => {
      render(<JourneyProgress {...defaultProps} hasPremiumAccess={false} />);

      // Should have lock icons for premium modules (company, role, company-role)
      // Check that the locked modules exist and have "Locked" text
      const moduleItem1 = screen.queryByTestId("module-item-1");
      const moduleItem2 = screen.queryByTestId("module-item-2");
      const moduleItem3 = screen.queryByTestId("module-item-3");

      // All 3 premium modules should be in the document
      expect(moduleItem1).toBeInTheDocument();
      expect(moduleItem2).toBeInTheDocument();
      expect(moduleItem3).toBeInTheDocument();

      // All 3 should have "Locked" text
      const lockedTexts = screen.getAllByText("Locked");
      expect(lockedTexts.length).toBe(3);

      // All 3 should have opacity styling indicating locked state
      expect(moduleItem1).toHaveClass("opacity-75");
      expect(moduleItem2).toHaveClass("opacity-75");
      expect(moduleItem3).toHaveClass("opacity-75");
    });

    it("does not show lock icons when user has premium access", () => {
      render(<JourneyProgress {...defaultProps} hasPremiumAccess={true} />);

      // No "Locked" text should be present
      const lockedTexts = screen.queryAllByText("Locked");
      expect(lockedTexts.length).toBe(0);

      // Premium modules should not have opacity styling
      const moduleItem1 = screen.queryByTestId("module-item-1");
      const moduleItem2 = screen.queryByTestId("module-item-2");
      const moduleItem3 = screen.queryByTestId("module-item-3");

      expect(moduleItem1).not.toHaveClass("opacity-75");
      expect(moduleItem2).not.toHaveClass("opacity-75");
      expect(moduleItem3).not.toHaveClass("opacity-75");
    });

    it("shows FREE badge for universal modules", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByText("FREE")).toBeInTheDocument();
    });

    it("shows COMPANY badge for company modules", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByText("COMPANY")).toBeInTheDocument();
    });

    it("shows ROLE badge for role modules", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByText("ROLE")).toBeInTheDocument();
    });

    it("shows TARGETED badge for company-role modules", () => {
      render(<JourneyProgress {...defaultProps} />);

      expect(screen.getByText("TARGETED")).toBeInTheDocument();
    });
  });

  describe("Module List Item States", () => {
    it("shows module as locked when premium without access", () => {
      render(<JourneyProgress {...defaultProps} hasPremiumAccess={false} />);

      // Find the second module item (company module)
      const moduleItem = screen.getByTestId("module-item-1");
      expect(moduleItem).toHaveClass("opacity-75");
    });

    it("does not show module as locked when has premium access", () => {
      render(<JourneyProgress {...defaultProps} hasPremiumAccess={true} />);

      // Company module should not have locked styling
      const moduleItem = screen.getByTestId("module-item-1");
      expect(moduleItem).not.toHaveClass("opacity-75");
    });
  });

  describe("Progress Bar", () => {
    it("renders progress bar with correct aria attributes", () => {
      render(<JourneyProgress {...defaultProps} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "0");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
      expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    });

    it("updates progress bar width based on completion", () => {
      const progress: CarouselProgress = {
        companySlug: "google",
        roleSlug: "software-engineer",
        currentIndex: 4,
        completedItems: Array.from({ length: 4 }, (_, i) => `item-${i}`),
        lastUpdated: Date.now(),
      };

      const { container } = render(
        <JourneyProgress {...defaultProps} totalItems={8} progress={progress} />
      );

      const progressFill = container.querySelector(".bg-blue-600.h-3");
      expect(progressFill).toHaveStyle({ width: "50%" });
    });
  });

  describe("Item Count Display", () => {
    it("shows correct items count text", () => {
      render(<JourneyProgress {...defaultProps} totalItems={16} />);

      expect(screen.getByText("0 of 16 items complete")).toBeInTheDocument();
    });

    it("updates items count when progress changes", () => {
      const progress: CarouselProgress = {
        companySlug: "google",
        roleSlug: "software-engineer",
        currentIndex: 5,
        completedItems: ["item-1", "item-2", "item-3", "item-4", "item-5"],
        lastUpdated: Date.now(),
      };

      render(
        <JourneyProgress {...defaultProps} totalItems={16} progress={progress} />
      );

      expect(screen.getByText("5 of 16 items complete")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible progress label", () => {
      render(<JourneyProgress {...defaultProps} />);

      const progressPercentage = screen.getByTestId("progress-percentage");
      expect(progressPercentage).toHaveAttribute(
        "aria-label",
        "0% complete"
      );
    });

    it("has accessible progress bar label", () => {
      render(<JourneyProgress {...defaultProps} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute(
        "aria-label",
        "Journey progress: 0% complete"
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles empty modules array", () => {
      render(<JourneyProgress {...defaultProps} allModules={[]} totalItems={0} />);

      expect(screen.getByTestId("journey-progress-card")).toBeInTheDocument();
      expect(screen.getByTestId("progress-percentage")).toHaveTextContent("0%");
    });

    it("handles null progress gracefully", () => {
      render(<JourneyProgress {...defaultProps} progress={null} />);

      expect(screen.getByTestId("progress-percentage")).toHaveTextContent("0%");
      expect(screen.getByTestId("continue-button")).toHaveTextContent(
        "Start Journey"
      );
    });

    it("handles zero totalItems gracefully", () => {
      render(<JourneyProgress {...defaultProps} totalItems={0} />);

      expect(screen.getByTestId("progress-percentage")).toHaveTextContent("0%");
    });
  });
});
