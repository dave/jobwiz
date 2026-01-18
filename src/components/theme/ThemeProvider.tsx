/**
 * ThemeProvider component for dynamic company theming
 * Issue: #36 - Company theming system
 */

import type { ResolvedTheme } from "@/lib/theme/types";
import { generateThemeStyle } from "@/lib/theme/css-variables";

interface ThemeProviderProps {
  theme: ResolvedTheme;
  children: React.ReactNode;
  /**
   * HTML element to use as wrapper
   * @default "div"
   */
  as?: "div" | "section" | "main" | "article";
  /**
   * Additional CSS class names
   */
  className?: string;
}

/**
 * Provides CSS custom properties for theming
 * Wraps children with a container that has theme CSS variables
 */
export function ThemeProvider({
  theme,
  children,
  as: Component = "div",
  className = "",
}: ThemeProviderProps) {
  const style = generateThemeStyle(theme);

  return (
    <Component
      className={className}
      style={style}
      data-theme={theme.companySlug}
      data-theme-default={theme.isDefault ? "true" : undefined}
    >
      {children}
    </Component>
  );
}
