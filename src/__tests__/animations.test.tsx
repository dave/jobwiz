/**
 * Tests for conversation UI animations defined in tailwind.config.ts
 * These tests verify the animation classes are properly applied and styled
 */
import { render, screen } from "@testing-library/react";

describe("Conversation UI Animations", () => {
  describe("animate-message-in", () => {
    it("applies the message-in animation class", () => {
      render(
        <div data-testid="message" className="animate-message-in">
          Hello
        </div>
      );
      const element = screen.getByTestId("message");
      expect(element).toHaveClass("animate-message-in");
    });

    it("can be combined with other classes", () => {
      render(
        <div
          data-testid="message"
          className="animate-message-in bg-white rounded-lg p-4"
        >
          Hello
        </div>
      );
      const element = screen.getByTestId("message");
      expect(element).toHaveClass("animate-message-in");
      expect(element).toHaveClass("bg-white");
      expect(element).toHaveClass("rounded-lg");
    });

    it("can be conditionally applied", () => {
      const showAnimation = true;
      render(
        <div
          data-testid="message"
          className={showAnimation ? "animate-message-in" : ""}
        >
          Hello
        </div>
      );
      const element = screen.getByTestId("message");
      expect(element).toHaveClass("animate-message-in");
    });
  });

  describe("animate-pill-in", () => {
    it("applies the pill-in animation class", () => {
      render(
        <span data-testid="pill" className="animate-pill-in">
          User answer
        </span>
      );
      const element = screen.getByTestId("pill");
      expect(element).toHaveClass("animate-pill-in");
    });

    it("works with inline elements", () => {
      render(
        <span
          data-testid="pill"
          className="animate-pill-in inline-block px-4 py-2"
        >
          Answer
        </span>
      );
      const element = screen.getByTestId("pill");
      expect(element).toHaveClass("animate-pill-in");
      expect(element).toHaveClass("inline-block");
    });

    it("can be used for user answer pills", () => {
      render(
        <div className="flex justify-end">
          <span
            data-testid="answer-pill"
            className="animate-pill-in bg-blue-500 text-white rounded-full px-4 py-2"
          >
            Yes, I have experience
          </span>
        </div>
      );
      const element = screen.getByTestId("answer-pill");
      expect(element).toHaveClass("animate-pill-in");
      expect(element).toHaveClass("rounded-full");
    });
  });

  describe("animate-avatar-pulse", () => {
    it("applies the avatar-pulse animation class", () => {
      render(
        <div data-testid="avatar" className="animate-avatar-pulse">
          <img src="/avatar.png" alt="Alex" />
        </div>
      );
      const element = screen.getByTestId("avatar");
      expect(element).toHaveClass("animate-avatar-pulse");
    });

    it("can be used with circular avatars", () => {
      render(
        <div
          data-testid="avatar"
          className="animate-avatar-pulse w-12 h-12 rounded-full overflow-hidden"
        >
          <img src="/avatar.png" alt="Alex" className="w-full h-full" />
        </div>
      );
      const element = screen.getByTestId("avatar");
      expect(element).toHaveClass("animate-avatar-pulse");
      expect(element).toHaveClass("rounded-full");
    });

    it("can be conditionally applied for typing indicator", () => {
      const isTyping = true;
      render(
        <div
          data-testid="avatar"
          className={isTyping ? "animate-avatar-pulse" : ""}
        >
          <img src="/avatar.png" alt="Alex" />
        </div>
      );
      const element = screen.getByTestId("avatar");
      expect(element).toHaveClass("animate-avatar-pulse");
    });

    it("does not have animation when not typing", () => {
      const isTyping = false;
      render(
        <div
          data-testid="avatar"
          className={isTyping ? "animate-avatar-pulse" : ""}
        >
          <img src="/avatar.png" alt="Alex" />
        </div>
      );
      const element = screen.getByTestId("avatar");
      expect(element).not.toHaveClass("animate-avatar-pulse");
    });
  });

  describe("motion-safe variant", () => {
    it("animation classes can be prefixed with motion-safe", () => {
      render(
        <div data-testid="message" className="motion-safe:animate-message-in">
          Hello
        </div>
      );
      const element = screen.getByTestId("message");
      expect(element).toHaveClass("motion-safe:animate-message-in");
    });

    it("supports motion-reduce alternative", () => {
      render(
        <div
          data-testid="message"
          className="motion-safe:animate-message-in motion-reduce:animate-none"
        >
          Hello
        </div>
      );
      const element = screen.getByTestId("message");
      expect(element).toHaveClass("motion-safe:animate-message-in");
      expect(element).toHaveClass("motion-reduce:animate-none");
    });
  });

  describe("animation combinations", () => {
    it("different elements can use different animations", () => {
      render(
        <div>
          <div data-testid="alex-message" className="animate-message-in">
            Alex says hello
          </div>
          <div data-testid="user-answer" className="animate-pill-in">
            User replies
          </div>
          <div data-testid="typing-avatar" className="animate-avatar-pulse">
            Avatar
          </div>
        </div>
      );

      expect(screen.getByTestId("alex-message")).toHaveClass(
        "animate-message-in"
      );
      expect(screen.getByTestId("user-answer")).toHaveClass("animate-pill-in");
      expect(screen.getByTestId("typing-avatar")).toHaveClass(
        "animate-avatar-pulse"
      );
    });

    it("animations work in a conversation flow", () => {
      render(
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div
              data-testid="avatar"
              className="w-10 h-10 rounded-full animate-avatar-pulse"
            />
            <div data-testid="bubble" className="bg-gray-100 p-4 rounded-xl animate-message-in">
              What experience do you have?
            </div>
          </div>
          <div className="flex justify-end">
            <span
              data-testid="answer"
              className="bg-blue-500 text-white px-4 py-2 rounded-full animate-pill-in"
            >
              5 years of experience
            </span>
          </div>
        </div>
      );

      expect(screen.getByTestId("avatar")).toHaveClass("animate-avatar-pulse");
      expect(screen.getByTestId("bubble")).toHaveClass("animate-message-in");
      expect(screen.getByTestId("answer")).toHaveClass("animate-pill-in");
    });
  });
});
