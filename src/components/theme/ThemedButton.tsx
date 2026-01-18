/**
 * ThemedButton component that uses company theme colors
 * Issue: #36 - Company theming system
 */

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ThemedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant
   * @default "primary"
   */
  variant?: "primary" | "secondary" | "outline";
  /**
   * Button size
   * @default "medium"
   */
  size?: "small" | "medium" | "large";
  /**
   * Full width button
   * @default false
   */
  fullWidth?: boolean;
}

const variantStyles = {
  primary: `
    bg-[var(--theme-primary,#2563eb)]
    text-[var(--theme-text-on-primary,#ffffff)]
    hover:bg-[var(--theme-primary-hover,#1d4ed8)]
  `,
  secondary: `
    bg-[var(--theme-secondary,#64748b)]
    text-[var(--theme-text-on-secondary,#ffffff)]
    hover:opacity-90
  `,
  outline: `
    bg-transparent
    border-2
    border-[var(--theme-primary,#2563eb)]
    text-[var(--theme-primary,#2563eb)]
    hover:bg-[var(--theme-primary-light,#dbeafe)]
  `,
};

const sizeStyles = {
  small: "px-4 py-2 text-sm min-h-[36px]",
  medium: "px-6 py-3 text-base min-h-[44px]",
  large: "px-8 py-4 text-lg min-h-[52px]",
};

/**
 * Button component that uses CSS custom properties for theming
 * Provides accessible touch target sizes (44px minimum)
 */
export const ThemedButton = forwardRef<HTMLButtonElement, ThemedButtonProps>(
  (
    {
      variant = "primary",
      size = "medium",
      fullWidth = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--theme-primary,#2563eb)]
      disabled:opacity-50 disabled:cursor-not-allowed
      min-w-[44px]
    `;

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ThemedButton.displayName = "ThemedButton";
