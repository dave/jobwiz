import { render, screen } from "@testing-library/react";
import { TextBlock } from "../TextBlock";
import type {
  TextBlock as TextBlockType,
  HeaderBlock as HeaderBlockType,
  QuoteBlock as QuoteBlockType,
  TipBlock as TipBlockType,
  WarningBlock as WarningBlockType,
} from "@/types/module";

describe("TextBlock", () => {
  describe("paragraph type", () => {
    it("renders paragraph type with content", () => {
      const block: TextBlockType = {
        id: "1",
        type: "text",
        content: "This is a paragraph of text.",
      };

      render(<TextBlock block={block} />);
      expect(screen.getByText("This is a paragraph of text.")).toBeInTheDocument();
    });

    it("renders markdown bold text", () => {
      const block: TextBlockType = {
        id: "1",
        type: "text",
        content: "This is **bold** text.",
      };

      render(<TextBlock block={block} />);
      expect(screen.getByText("bold")).toBeInTheDocument();
      const boldElement = screen.getByText("bold");
      expect(boldElement.tagName.toLowerCase()).toBe("strong");
    });

    it("renders markdown italic text", () => {
      const block: TextBlockType = {
        id: "1",
        type: "text",
        content: "This is *italic* text.",
      };

      render(<TextBlock block={block} />);
      expect(screen.getByText("italic")).toBeInTheDocument();
      const italicElement = screen.getByText("italic");
      expect(italicElement.tagName.toLowerCase()).toBe("em");
    });

    it("renders markdown links", () => {
      const block: TextBlockType = {
        id: "1",
        type: "text",
        content: "Check out [this link](https://example.com).",
      };

      render(<TextBlock block={block} />);
      const link = screen.getByRole("link", { name: "this link" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com");
    });
  });

  describe("header type", () => {
    it("renders h1 header", () => {
      const block: HeaderBlockType = {
        id: "1",
        type: "header",
        content: "Main Heading",
        level: 1,
      };

      render(<TextBlock block={block} />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Main Heading");
    });

    it("renders h2 header", () => {
      const block: HeaderBlockType = {
        id: "1",
        type: "header",
        content: "Section Heading",
        level: 2,
      };

      render(<TextBlock block={block} />);
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Section Heading");
    });

    it("renders h3 header", () => {
      const block: HeaderBlockType = {
        id: "1",
        type: "header",
        content: "Subsection Heading",
        level: 3,
      };

      render(<TextBlock block={block} />);
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Subsection Heading");
    });
  });

  describe("quote type", () => {
    it("renders quote with visual distinction", () => {
      const block: QuoteBlockType = {
        id: "1",
        type: "quote",
        content: "To be or not to be.",
      };

      render(<TextBlock block={block} />);
      const blockquote = document.querySelector("blockquote");
      expect(blockquote).toBeInTheDocument();
      expect(screen.getByText("To be or not to be.")).toBeInTheDocument();
    });

    it("renders quote with author", () => {
      const block: QuoteBlockType = {
        id: "1",
        type: "quote",
        content: "To be or not to be.",
        author: "Shakespeare",
      };

      render(<TextBlock block={block} />);
      expect(screen.getByText(/Shakespeare/)).toBeInTheDocument();
    });

    it("applies theme colors to quote border", () => {
      const block: QuoteBlockType = {
        id: "1",
        type: "quote",
        content: "Themed quote.",
      };

      const { container } = render(
        <TextBlock block={block} theme={{ primary: "#ff0000" }} />
      );
      const blockquote = container.querySelector("blockquote");
      expect(blockquote).toHaveStyle({ borderColor: "#ff0000" });
    });
  });

  describe("tip type", () => {
    it("renders tip with icon", () => {
      const block: TipBlockType = {
        id: "1",
        type: "tip",
        content: "Here is a helpful tip!",
      };

      render(<TextBlock block={block} />);
      expect(screen.getByText("Here is a helpful tip!")).toBeInTheDocument();
      // Check for the note role
      expect(screen.getByRole("note")).toBeInTheDocument();
    });

    it("renders tip with green styling", () => {
      const block: TipBlockType = {
        id: "1",
        type: "tip",
        content: "Green tip content.",
      };

      const { container } = render(<TextBlock block={block} />);
      const tipContainer = container.querySelector('[role="note"]');
      expect(tipContainer).toHaveClass("bg-green-50");
    });
  });

  describe("warning type", () => {
    it("renders warning with icon", () => {
      const block: WarningBlockType = {
        id: "1",
        type: "warning",
        content: "Be careful about this!",
      };

      render(<TextBlock block={block} />);
      expect(screen.getByText("Be careful about this!")).toBeInTheDocument();
      // Check for the alert role
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("renders warning with yellow/amber styling", () => {
      const block: WarningBlockType = {
        id: "1",
        type: "warning",
        content: "Warning content.",
      };

      const { container } = render(<TextBlock block={block} />);
      const warningContainer = container.querySelector('[role="alert"]');
      expect(warningContainer).toHaveClass("bg-amber-50");
    });
  });
});
