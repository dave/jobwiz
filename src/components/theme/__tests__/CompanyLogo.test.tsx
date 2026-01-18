/**
 * Tests for CompanyLogo component
 * Issue: #36 - Company theming system
 */

import { render, screen } from "@testing-library/react";
import { CompanyLogo } from "../CompanyLogo";

describe("CompanyLogo", () => {
  describe("with logo URL", () => {
    test("renders image with logo URL", () => {
      render(
        <CompanyLogo
          logoUrl="https://example.com/logo.png"
          companyName="Google"
        />
      );

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("alt", "Google logo");
    });

    test("applies correct size classes", () => {
      const { container: small } = render(
        <CompanyLogo
          logoUrl="https://example.com/logo.png"
          companyName="Google"
          size="small"
        />
      );
      expect(small.querySelector(".w-8")).toBeInTheDocument();

      const { container: medium } = render(
        <CompanyLogo
          logoUrl="https://example.com/logo.png"
          companyName="Google"
          size="medium"
        />
      );
      expect(medium.querySelector(".w-12")).toBeInTheDocument();

      const { container: large } = render(
        <CompanyLogo
          logoUrl="https://example.com/logo.png"
          companyName="Google"
          size="large"
        />
      );
      expect(large.querySelector(".w-16")).toBeInTheDocument();
    });

    test("defaults to medium size", () => {
      const { container } = render(
        <CompanyLogo
          logoUrl="https://example.com/logo.png"
          companyName="Google"
        />
      );

      expect(container.querySelector(".w-12")).toBeInTheDocument();
    });

    test("applies custom className", () => {
      const { container } = render(
        <CompanyLogo
          logoUrl="https://example.com/logo.png"
          companyName="Google"
          className="custom-class"
        />
      );

      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  describe("without logo URL (fallback)", () => {
    test("renders initials placeholder", () => {
      render(<CompanyLogo logoUrl={null} companyName="Google" />);

      expect(screen.getByText("G")).toBeInTheDocument();
    });

    test("uses two initials for multi-word names", () => {
      render(<CompanyLogo logoUrl={null} companyName="Meta Platforms" />);

      expect(screen.getByText("MP")).toBeInTheDocument();
    });

    test("handles single word names", () => {
      render(<CompanyLogo logoUrl={null} companyName="Apple" />);

      expect(screen.getByText("A")).toBeInTheDocument();
    });

    test("handles long company names", () => {
      render(
        <CompanyLogo
          logoUrl={null}
          companyName="International Business Machines Corporation"
        />
      );

      // Should only take first two initials
      expect(screen.getByText("IB")).toBeInTheDocument();
    });

    test("sets aria-label for accessibility", () => {
      render(<CompanyLogo logoUrl={null} companyName="Google" />);

      const placeholder = screen.getByLabelText("Google logo placeholder");
      expect(placeholder).toBeInTheDocument();
    });

    test("applies theme-based colors", () => {
      const { container } = render(
        <CompanyLogo logoUrl={null} companyName="Google" />
      );

      const placeholder = container.querySelector("[aria-label]");
      expect(placeholder).toHaveClass("bg-[var(--theme-primary-light,#dbeafe)]");
      expect(placeholder).toHaveClass("text-[var(--theme-primary,#2563eb)]");
    });

    test("applies correct size for placeholder", () => {
      const { container: large } = render(
        <CompanyLogo logoUrl={null} companyName="Google" size="large" />
      );

      expect(large.querySelector(".w-16")).toBeInTheDocument();
    });
  });
});
