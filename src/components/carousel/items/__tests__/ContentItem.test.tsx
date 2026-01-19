import { render, screen } from "@testing-library/react";
import { ContentItem } from "../ContentItem";
import type {
  TextBlock,
  HeaderBlock,
  QuoteBlock,
  TipBlock,
  WarningBlock,
} from "@/types/module";

describe("ContentItem", () => {
  describe("Text Block", () => {
    const textBlock: TextBlock = {
      id: "text-1",
      type: "text",
      content: "This is some **bold** and *italic* text.",
    };

    it("renders text content with markdown", () => {
      render(<ContentItem block={textBlock} />);
      expect(screen.getByText(/This is some/)).toBeInTheDocument();
      expect(screen.getByText("bold")).toBeInTheDocument();
      expect(screen.getByText("italic")).toBeInTheDocument();
    });

    it("applies centered layout styling", () => {
      const { container } = render(<ContentItem block={textBlock} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "items-center", "justify-center");
    });

    it("uses large typography", () => {
      const { container } = render(<ContentItem block={textBlock} />);
      const textContainer = container.querySelector(".prose");
      expect(textContainer).toBeInTheDocument();
      expect(textContainer).toHaveClass("text-xl", "sm:text-2xl");
    });

    it("accepts custom className", () => {
      const { container } = render(
        <ContentItem block={textBlock} className="custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });
  });

  describe("Header Block", () => {
    it("renders h1 with correct styling", () => {
      const h1Block: HeaderBlock = {
        id: "h1-1",
        type: "header",
        content: "Main Heading",
        level: 1,
      };
      render(<ContentItem block={h1Block} />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Main Heading");
      expect(heading).toHaveClass("text-4xl", "sm:text-5xl", "font-bold");
    });

    it("renders h2 with correct styling", () => {
      const h2Block: HeaderBlock = {
        id: "h2-1",
        type: "header",
        content: "Sub Heading",
        level: 2,
      };
      render(<ContentItem block={h2Block} />);
      const heading = screen.getByRole("heading", { level: 1 }); // We use h1 tag but style as h2
      expect(heading).toHaveTextContent("Sub Heading");
      expect(heading).toHaveClass("text-3xl", "sm:text-4xl", "font-semibold");
    });

    it("renders h3 with correct styling", () => {
      const h3Block: HeaderBlock = {
        id: "h3-1",
        type: "header",
        content: "Minor Heading",
        level: 3,
      };
      render(<ContentItem block={h3Block} />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Minor Heading");
      expect(heading).toHaveClass("text-2xl", "sm:text-3xl", "font-medium");
    });

    it("centers the heading", () => {
      const h1Block: HeaderBlock = {
        id: "h1-1",
        type: "header",
        content: "Main Heading",
        level: 1,
      };
      const { container } = render(<ContentItem block={h1Block} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("text-center");
    });
  });

  describe("Quote Block", () => {
    const quoteBlock: QuoteBlock = {
      id: "quote-1",
      type: "quote",
      content: "To be or not to be.",
      author: "Shakespeare",
    };

    it("renders quote content", () => {
      render(<ContentItem block={quoteBlock} />);
      expect(screen.getByText("To be or not to be.")).toBeInTheDocument();
    });

    it("renders author attribution", () => {
      render(<ContentItem block={quoteBlock} />);
      expect(screen.getByText(/— Shakespeare/)).toBeInTheDocument();
    });

    it("renders without author when not provided", () => {
      const quoteWithoutAuthor: QuoteBlock = {
        id: "quote-2",
        type: "quote",
        content: "A quote without attribution.",
      };
      render(<ContentItem block={quoteWithoutAuthor} />);
      expect(screen.getByText("A quote without attribution.")).toBeInTheDocument();
      expect(screen.queryByText(/—/)).not.toBeInTheDocument();
    });

    it("uses italic styling for quote", () => {
      render(<ContentItem block={quoteBlock} />);
      const quote = screen.getByText("To be or not to be.");
      expect(quote).toHaveClass("italic");
    });

    it("displays quote icon", () => {
      const { container } = render(<ContentItem block={quoteBlock} />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Tip Block", () => {
    const tipBlock: TipBlock = {
      id: "tip-1",
      type: "tip",
      content: "Here is a helpful tip with **emphasis**.",
    };

    it("renders tip content with markdown", () => {
      render(<ContentItem block={tipBlock} />);
      expect(screen.getByText(/Here is a helpful tip/)).toBeInTheDocument();
      expect(screen.getByText("emphasis")).toBeInTheDocument();
    });

    it("has role=note for accessibility", () => {
      render(<ContentItem block={tipBlock} />);
      expect(screen.getByRole("note")).toBeInTheDocument();
    });

    it("displays Pro Tip label", () => {
      render(<ContentItem block={tipBlock} />);
      expect(screen.getByText("Pro Tip")).toBeInTheDocument();
    });

    it("uses green styling", () => {
      const { container } = render(<ContentItem block={tipBlock} />);
      const tipContainer = container.querySelector(".bg-green-50");
      expect(tipContainer).toBeInTheDocument();
    });

    it("displays lightbulb icon", () => {
      const { container } = render(<ContentItem block={tipBlock} />);
      const iconContainer = container.querySelector(".text-green-600");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Warning Block", () => {
    const warningBlock: WarningBlock = {
      id: "warning-1",
      type: "warning",
      content: "Avoid this common mistake!",
    };

    it("renders warning content", () => {
      render(<ContentItem block={warningBlock} />);
      expect(screen.getByText("Avoid this common mistake!")).toBeInTheDocument();
    });

    it("has role=alert for accessibility", () => {
      render(<ContentItem block={warningBlock} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("displays Watch Out label", () => {
      render(<ContentItem block={warningBlock} />);
      expect(screen.getByText("Watch Out")).toBeInTheDocument();
    });

    it("uses amber styling", () => {
      const { container } = render(<ContentItem block={warningBlock} />);
      const warningContainer = container.querySelector(".bg-amber-50");
      expect(warningContainer).toBeInTheDocument();
    });

    it("displays warning icon", () => {
      const { container } = render(<ContentItem block={warningBlock} />);
      const iconContainer = container.querySelector(".text-amber-600");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    const textBlock: TextBlock = {
      id: "text-1",
      type: "text",
      content: "Test content",
    };

    it("uses min-height for vertical centering", () => {
      const { container } = render(<ContentItem block={textBlock} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("min-h-[50vh]");
    });

    it("has responsive padding", () => {
      const { container } = render(<ContentItem block={textBlock} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("px-4", "py-8");
    });

    it("limits max width for readability", () => {
      const { container } = render(<ContentItem block={textBlock} />);
      const innerWrapper = container.querySelector(".max-w-2xl");
      expect(innerWrapper).toBeInTheDocument();
    });
  });
});
