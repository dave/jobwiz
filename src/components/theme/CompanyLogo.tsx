/**
 * CompanyLogo component with fallback placeholder
 * Issue: #36 - Company theming system
 */

import Image from "next/image";

interface CompanyLogoProps {
  logoUrl: string | null;
  companyName: string;
  /**
   * Size preset for the logo
   * @default "medium"
   */
  size?: "small" | "medium" | "large";
  /**
   * Additional CSS class names
   */
  className?: string;
}

const sizeMap = {
  small: { height: 32, maxWidth: 200, className: "h-8" },
  medium: { height: 48, maxWidth: 300, className: "h-12" },
  large: { height: 64, maxWidth: 400, className: "h-16" },
};

/**
 * Get initials from company name for placeholder
 */
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Displays company logo with fallback to initials placeholder
 * Uses fixed height with auto width to maintain aspect ratio
 */
export function CompanyLogo({
  logoUrl,
  companyName,
  size = "medium",
  className = "",
}: CompanyLogoProps) {
  const dimensions = sizeMap[size];

  if (logoUrl) {
    const isSvg = logoUrl.endsWith(".svg");

    return (
      <div
        className={`flex items-center justify-center ${dimensions.className} ${className}`}
        style={{
          minHeight: dimensions.height,
          maxWidth: dimensions.maxWidth,
        }}
      >
        {isSvg ? (
          // SVG: use img tag for proper scaling without fixed dimensions
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${companyName} logo`}
            className="h-full w-auto max-w-full object-contain"
            style={{ maxHeight: dimensions.height }}
          />
        ) : (
          // PNG/other: use Next.js Image with explicit dimensions
          <Image
            src={logoUrl}
            alt={`${companyName} logo`}
            width={dimensions.height}
            height={dimensions.height}
            className="h-full w-auto max-w-full object-contain"
            priority
          />
        )}
      </div>
    );
  }

  // Fallback placeholder with initials
  const initials = getInitials(companyName);
  const placeholderSize = dimensions.height;

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-[var(--theme-primary-light,#dbeafe)] text-[var(--theme-primary,#2563eb)] font-bold ${className}`}
      style={{ width: placeholderSize, height: placeholderSize }}
      aria-label={`${companyName} logo placeholder`}
    >
      {initials}
    </div>
  );
}
