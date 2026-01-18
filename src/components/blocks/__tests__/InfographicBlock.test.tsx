import { render, screen, fireEvent } from "@testing-library/react";
import { InfographicBlock } from "../InfographicBlock";
import type { InfographicBlock as InfographicBlockType } from "@/types/module";

describe("InfographicBlock", () => {
  const defaultBlock: InfographicBlockType = {
    id: "1",
    type: "infographic",
    url: "https://example.com/image.png",
    alt: "Test infographic image",
    caption: "This is a test caption",
  };

  it("renders image with alt text", () => {
    render(<InfographicBlock block={defaultBlock} />);
    const img = screen.getByAltText("Test infographic image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/image.png");
  });

  it("displays caption when provided", () => {
    render(<InfographicBlock block={defaultBlock} />);
    expect(screen.getByText("This is a test caption")).toBeInTheDocument();
  });

  it("renders without caption", () => {
    const blockNoCaption: InfographicBlockType = {
      id: "1",
      type: "infographic",
      url: "https://example.com/image.png",
      alt: "No caption image",
    };

    render(<InfographicBlock block={blockNoCaption} />);
    expect(screen.getByAltText("No caption image")).toBeInTheDocument();
    expect(screen.queryByRole("figure")).toBeInTheDocument();
  });

  it("opens zoom modal on click", () => {
    render(<InfographicBlock block={defaultBlock} />);
    const imageButton = screen.getByLabelText(
      "View Test infographic image in full size"
    );

    fireEvent.click(imageButton);

    // Check modal is open (dialog role)
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Check close button exists
    expect(screen.getByLabelText("Close zoom view")).toBeInTheDocument();
  });

  it("closes zoom modal on close button click", () => {
    render(<InfographicBlock block={defaultBlock} />);
    const imageButton = screen.getByLabelText(
      "View Test infographic image in full size"
    );

    // Open modal
    fireEvent.click(imageButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByLabelText("Close zoom view");
    fireEvent.click(closeButton);

    // Modal should be gone
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes zoom modal on escape key", () => {
    render(<InfographicBlock block={defaultBlock} />);
    const imageButton = screen.getByLabelText(
      "View Test infographic image in full size"
    );

    // Open modal
    fireEvent.click(imageButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Press escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Modal should be gone
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes zoom modal on backdrop click", () => {
    render(<InfographicBlock block={defaultBlock} />);
    const imageButton = screen.getByLabelText(
      "View Test infographic image in full size"
    );

    // Open modal
    fireEvent.click(imageButton);
    const dialog = screen.getByRole("dialog");

    // Click on backdrop (the dialog itself)
    fireEvent.click(dialog);

    // Modal should be gone
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has focusable image button", () => {
    render(<InfographicBlock block={defaultBlock} />);
    const imageButton = screen.getByLabelText(
      "View Test infographic image in full size"
    );
    expect(imageButton.tagName.toLowerCase()).toBe("button");
  });
});
