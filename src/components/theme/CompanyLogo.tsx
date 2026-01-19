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
  small: { width: 40, height: 40, className: "w-10 h-10" },
  medium: { width: 64, height: 64, className: "w-16 h-16" },
  large: { width: 100, height: 100, className: "w-[100px] h-[100px]" },
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
 */
export function CompanyLogo({
  logoUrl,
  companyName,
  size = "medium",
  className = "",
}: CompanyLogoProps) {
  const dimensions = sizeMap[size];

  if (logoUrl) {
    return (
      <div
        className={`relative overflow-hidden ${dimensions.className} ${className}`}
        style={{ aspectRatio: "1 / 1" }}
      >
        <Image
          src={logoUrl}
          alt={`${companyName} logo`}
          fill
          className="object-contain"
          sizes={`${dimensions.width * 2}px`}
          quality={100}
        />
      </div>
    );
  }

  // Fallback placeholder with initials
  const initials = getInitials(companyName);

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-[var(--theme-primary-light,#dbeafe)] text-[var(--theme-primary,#2563eb)] font-bold ${dimensions.className} ${className}`}
      aria-label={`${companyName} logo placeholder`}
    >
      {initials}
    </div>
  );
}
