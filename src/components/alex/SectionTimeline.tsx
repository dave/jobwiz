"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCarousel } from "@/components/carousel";

/**
 * Timeline section data derived from carousel items
 */
export interface TimelineSection {
  /** Unique identifier (module slug or section title) */
  id: string;
  /** Display title */
  title: string;
  /** Index of first item in this section */
  startIndex: number;
  /** Whether all items in section are completed */
  isCompleted: boolean;
  /** Whether section is currently active */
  isCurrent: boolean;
}

export interface SectionTimelineProps {
  /** Callback when section is clicked */
  onSectionClick?: (sectionId: string, startIndex: number) => void;
  /** Custom class name */
  className?: string;
  /** Test ID */
  "data-testid"?: string;
}

/**
 * Extract sections from carousel items.
 * Groups items by their sectionTitle or moduleSlug.
 */
function extractSections(
  items: ReturnType<typeof useCarousel>["state"]["items"],
  currentIndex: number,
  completedItems: Set<string>
): TimelineSection[] {
  const sectionMap = new Map<
    string,
    { title: string; startIndex: number; itemIds: string[] }
  >();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    // Skip paywall items in section grouping
    if (item.type === "paywall") continue;

    // Use sectionTitle if available, otherwise moduleSlug
    const sectionId = item.sectionTitle || item.moduleSlug;
    const sectionTitle = item.sectionTitle || formatModuleSlug(item.moduleSlug);

    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        title: sectionTitle,
        startIndex: i,
        itemIds: [],
      });
    }

    sectionMap.get(sectionId)!.itemIds.push(item.id);
  }

  // Find which section contains the current index
  let currentSectionId: string | null = null;
  for (const [sectionId, data] of sectionMap.entries()) {
    const lastItemIndex = items.findIndex(
      (item) => item?.id === data.itemIds[data.itemIds.length - 1]
    );
    if (currentIndex >= data.startIndex && currentIndex <= lastItemIndex) {
      currentSectionId = sectionId;
      break;
    }
  }

  // Convert to TimelineSection array
  const sections: TimelineSection[] = [];
  for (const [sectionId, data] of sectionMap.entries()) {
    const isCompleted = data.itemIds.every((id) => completedItems.has(id));
    sections.push({
      id: sectionId,
      title: data.title,
      startIndex: data.startIndex,
      isCompleted,
      isCurrent: sectionId === currentSectionId,
    });
  }

  // Sort by startIndex
  sections.sort((a, b) => a.startIndex - b.startIndex);

  return sections;
}

/**
 * Format module slug to readable title
 * e.g., "company-google" -> "Company Google"
 */
function formatModuleSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Check icon (checkmark)
 */
function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

/**
 * Menu icon for mobile drawer toggle
 */
function MenuIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

/**
 * Close icon for mobile drawer
 */
function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * SectionTimeline Component
 *
 * Displays progress through modules/sections as a vertical timeline.
 *
 * Desktop: Fixed left sidebar
 * Mobile: Hidden by default, slide-in drawer on tap
 *
 * Features:
 * - Dots with lines connecting sections
 * - Completed = checkmark, Current = highlighted, Upcoming = gray
 * - Click to jump to section start
 */
export function SectionTimeline({
  onSectionClick,
  className = "",
  "data-testid": testId,
}: SectionTimelineProps) {
  const prefersReducedMotion = useReducedMotion();
  const carousel = useCarousel();
  const { state, goTo } = carousel;
  const { items, currentIndex, completedItems } = state;

  // Mobile drawer open state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Extract sections from items
  const sections = extractSections(items, currentIndex, completedItems);

  // Calculate overall progress
  const completedCount = sections.filter((s) => s.isCompleted).length;
  const progress =
    sections.length > 0
      ? Math.round((completedCount / sections.length) * 100)
      : 0;

  // Handle section click
  const handleSectionClick = useCallback(
    (section: TimelineSection) => {
      // Only allow clicking completed sections or current section
      const sectionIndex = sections.indexOf(section);
      const currentSectionIndex = sections.findIndex((s) => s.isCurrent);

      if (section.isCompleted || sectionIndex <= currentSectionIndex) {
        goTo(section.startIndex);
        onSectionClick?.(section.id, section.startIndex);

        // Close mobile drawer after selection
        setIsDrawerOpen(false);
      }
    },
    [sections, goTo, onSectionClick]
  );

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  // Animation variants
  const drawerVariants = {
    closed: { x: "-100%" },
    open: { x: 0 },
  };

  const backdropVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 },
  };

  // Render timeline content (shared between desktop and mobile)
  const timelineContent = (
    <>
      {/* Progress header */}
      <div style={progressHeaderStyle}>
        <span style={progressLabelStyle}>Your Progress</span>
        <span style={progressPercentStyle}>{progress}%</span>
      </div>
      <div style={progressBarContainerStyle}>
        <motion.div
          style={progressBarFillStyle}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
            ease: "easeOut",
          }}
        />
      </div>

      {/* Sections list */}
      <nav aria-label="Journey sections" style={sectionsListStyle}>
        {sections.map((section, index) => {
          const isClickable =
            section.isCompleted ||
            index <= sections.findIndex((s) => s.isCurrent);
          const isLast = index === sections.length - 1;

          return (
            <button
              key={section.id}
              onClick={() => handleSectionClick(section)}
              disabled={!isClickable}
              style={{
                ...sectionButtonStyle,
                cursor: isClickable ? "pointer" : "default",
                opacity: isClickable ? 1 : 0.5,
              }}
              aria-current={section.isCurrent ? "step" : undefined}
              aria-label={`${section.title}${section.isCompleted ? " (completed)" : section.isCurrent ? " (current)" : ""}`}
              data-testid={`section-${section.id}`}
            >
              {/* Dot and line container */}
              <div style={dotContainerStyle}>
                {/* Dot */}
                <div
                  style={{
                    ...dotStyle,
                    backgroundColor: section.isCompleted
                      ? "var(--accent, #22c55e)"
                      : section.isCurrent
                        ? "var(--primary)"
                        : "var(--faint, #e5e5e5)",
                    color:
                      section.isCompleted || section.isCurrent
                        ? "white"
                        : "var(--secondary, #737373)",
                  }}
                >
                  {section.isCompleted ? <CheckIcon /> : null}
                </div>

                {/* Connecting line (except for last item) */}
                {!isLast && (
                  <div
                    style={{
                      ...lineStyle,
                      backgroundColor:
                        section.isCompleted && sections[index + 1]?.isCompleted
                          ? "var(--accent, #22c55e)"
                          : "var(--faint, #e5e5e5)",
                    }}
                  />
                )}
              </div>

              {/* Section title */}
              <span
                style={{
                  ...sectionTitleStyle,
                  fontWeight: section.isCurrent ? 600 : 400,
                  color: section.isCurrent
                    ? "var(--primary)"
                    : "var(--foreground, #171717)",
                }}
              >
                {section.title}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop: Fixed left sidebar (hidden on mobile, visible on lg+) */}
      <aside
        className={`section-timeline-desktop hidden lg:flex ${className}`.trim()}
        style={desktopSidebarStyle}
        data-testid={testId}
        aria-label="Journey progress"
      >
        {timelineContent}
      </aside>

      {/* Mobile: Toggle button (visible on mobile only, hidden on lg+) */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="lg:hidden"
        style={mobileToggleStyle}
        aria-label="Open progress menu"
        aria-expanded={isDrawerOpen}
        data-testid="timeline-toggle"
      >
        <MenuIcon />
      </button>

      {/* Mobile: Slide-in drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              style={backdropStyle}
              initial="closed"
              animate="open"
              exit="closed"
              variants={backdropVariants}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.2,
              }}
              onClick={() => setIsDrawerOpen(false)}
              aria-hidden="true"
              data-testid="drawer-backdrop"
            />

            {/* Drawer */}
            <motion.aside
              style={mobileDrawerStyle}
              initial="closed"
              animate="open"
              exit="closed"
              variants={drawerVariants}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              role="dialog"
              aria-label="Journey progress"
              aria-modal="true"
              data-testid="timeline-drawer"
            >
              {/* Close button */}
              <button
                onClick={() => setIsDrawerOpen(false)}
                style={drawerCloseButtonStyle}
                aria-label="Close progress menu"
                data-testid="drawer-close"
              >
                <CloseIcon />
              </button>

              {timelineContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ===========================
// Styles
// ===========================

const desktopSidebarStyle: React.CSSProperties = {
  flexDirection: "column",
  width: "280px",
  height: "100vh",
  position: "sticky",
  top: 0,
  padding: "var(--space-4)",
  borderRight: "1px solid var(--faint, #e5e5e5)",
  backgroundColor: "var(--surface-elevated, #f5f5f5)",
  overflowY: "auto",
};

const mobileToggleStyle: React.CSSProperties = {
  position: "fixed",
  top: "var(--space-4)",
  left: "var(--space-4)",
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  backgroundColor: "var(--surface-elevated, #f5f5f5)",
  border: "1px solid var(--faint, #e5e5e5)",
  color: "var(--foreground, #171717)",
  cursor: "pointer",
  zIndex: 40,
};

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  zIndex: 49,
};

const mobileDrawerStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  bottom: 0,
  width: "280px",
  maxWidth: "80vw",
  backgroundColor: "var(--surface-elevated, #f5f5f5)",
  padding: "var(--space-4)",
  paddingTop: "calc(var(--space-4) + env(safe-area-inset-top))",
  paddingBottom: "calc(var(--space-4) + env(safe-area-inset-bottom))",
  overflowY: "auto",
  zIndex: 50,
};

const drawerCloseButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(var(--space-4) + env(safe-area-inset-top))",
  right: "var(--space-4)",
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  backgroundColor: "transparent",
  border: "none",
  color: "var(--foreground, #171717)",
  cursor: "pointer",
};

const progressHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "var(--space-2)",
  marginTop: "var(--space-6)",
};

const progressLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--secondary, #737373)",
};

const progressPercentStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--primary)",
};

const progressBarContainerStyle: React.CSSProperties = {
  height: "6px",
  borderRadius: "var(--radius-full, 9999px)",
  backgroundColor: "var(--faint, #e5e5e5)",
  overflow: "hidden",
  marginBottom: "var(--space-6)",
};

const progressBarFillStyle: React.CSSProperties = {
  height: "100%",
  backgroundColor: "var(--primary)",
  borderRadius: "var(--radius-full, 9999px)",
};

const sectionsListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
};

const sectionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-3)",
  padding: "var(--space-2) 0",
  background: "transparent",
  border: "none",
  textAlign: "left",
  width: "100%",
  minHeight: "48px", // Touch target
};

const dotContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: "var(--timeline-dot, 12px)",
  flexShrink: 0,
};

const dotStyle: React.CSSProperties = {
  width: "var(--timeline-dot, 12px)",
  height: "var(--timeline-dot, 12px)",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const lineStyle: React.CSSProperties = {
  width: "var(--timeline-line, 2px)",
  height: "32px",
  marginTop: "var(--space-1)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.4,
  paddingTop: "1px", // Slight adjustment for alignment with dot
};

export default SectionTimeline;
