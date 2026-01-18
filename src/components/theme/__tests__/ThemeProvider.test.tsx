/**
 * Tests for ThemeProvider component
 * Issue: #36 - Company theming system
 */

import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../ThemeProvider";
import type { ResolvedTheme } from "@/lib/theme/types";

describe("ThemeProvider", () => {
  const mockTheme: ResolvedTheme = {
    companySlug: "google",
    logoUrl: null,
    primaryColor: "#4285f4",
    secondaryColor: "#34a853",
    industryCategory: "Big Tech",
    isDefault: false,
  };

  const defaultTheme: ResolvedTheme = {
    companySlug: "unknown",
    logoUrl: null,
    primaryColor: "#2563eb",
    secondaryColor: "#64748b",
    industryCategory: null,
    isDefault: true,
  };

  test("renders children", () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <span data-testid="child">Child content</span>
      </ThemeProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("sets data-theme attribute", () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <span>Content</span>
      </ThemeProvider>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute("data-theme")).toBe("google");
  });

  test("sets data-theme-default for default themes", () => {
    const { container } = render(
      <ThemeProvider theme={defaultTheme}>
        <span>Content</span>
      </ThemeProvider>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute("data-theme-default")).toBe("true");
  });

  test("does not set data-theme-default for custom themes", () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <span>Content</span>
      </ThemeProvider>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.hasAttribute("data-theme-default")).toBe(false);
  });

  test("applies CSS variables as inline styles", () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <span>Content</span>
      </ThemeProvider>
    );

    const wrapper = container.firstChild as HTMLElement;
    const style = wrapper.style;

    expect(style.getPropertyValue("--theme-primary")).toBe("#4285f4");
    expect(style.getPropertyValue("--theme-secondary")).toBe("#34a853");
  });

  test("renders as div by default", () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <span>Content</span>
      </ThemeProvider>
    );

    expect(container.firstChild?.nodeName).toBe("DIV");
  });

  test("can render as different elements", () => {
    const { container: sectionContainer } = render(
      <ThemeProvider theme={mockTheme} as="section">
        <span>Content</span>
      </ThemeProvider>
    );
    expect(sectionContainer.firstChild?.nodeName).toBe("SECTION");

    const { container: mainContainer } = render(
      <ThemeProvider theme={mockTheme} as="main">
        <span>Content</span>
      </ThemeProvider>
    );
    expect(mainContainer.firstChild?.nodeName).toBe("MAIN");

    const { container: articleContainer } = render(
      <ThemeProvider theme={mockTheme} as="article">
        <span>Content</span>
      </ThemeProvider>
    );
    expect(articleContainer.firstChild?.nodeName).toBe("ARTICLE");
  });

  test("applies className", () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme} className="custom-class">
        <span>Content</span>
      </ThemeProvider>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("custom-class");
  });

  test("generates hover color variable", () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <span>Content</span>
      </ThemeProvider>
    );

    const wrapper = container.firstChild as HTMLElement;
    const hoverColor = wrapper.style.getPropertyValue("--theme-primary-hover");

    expect(hoverColor).toBeDefined();
    expect(hoverColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test("generates light color variables", () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <span>Content</span>
      </ThemeProvider>
    );

    const wrapper = container.firstChild as HTMLElement;
    const primaryLight = wrapper.style.getPropertyValue("--theme-primary-light");
    const secondaryLight = wrapper.style.getPropertyValue("--theme-secondary-light");

    expect(primaryLight).toBeDefined();
    expect(secondaryLight).toBeDefined();
  });

  test("generates text color variables", () => {
    const { container } = render(
      <ThemeProvider theme={mockTheme}>
        <span>Content</span>
      </ThemeProvider>
    );

    const wrapper = container.firstChild as HTMLElement;
    const textOnPrimary = wrapper.style.getPropertyValue("--theme-text-on-primary");
    const textOnSecondary = wrapper.style.getPropertyValue("--theme-text-on-secondary");

    expect(["#000000", "#ffffff"]).toContain(textOnPrimary);
    expect(["#000000", "#ffffff"]).toContain(textOnSecondary);
  });
});
