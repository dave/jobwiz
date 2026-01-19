"use client";

/**
 * JourneyProgress Component
 * Issue: #136 - C4: Journey progress display
 *
 * Shows carousel progress on journey overview page:
 * - Overall % complete
 * - Current module name
 * - Continue button that links to learn page (resumes position)
 * - Lock icons for unpurchased premium modules
 */

import { useMemo } from "react";
import Link from "next/link";
import type { Module } from "@/types/module";
import type { CarouselProgress } from "@/types/carousel";

/** Lock icon SVG component */
function LockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Checkmark icon SVG component */
function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export interface JourneyProgressProps {
  /** Company slug for linking */
  companySlug: string;
  /** Role slug for linking */
  roleSlug: string;
  /** Company display name */
  companyName: string;
  /** Role display name */
  roleName: string;
  /** All modules in order (free first, then premium) */
  allModules: Module[];
  /** Total number of items in carousel */
  totalItems: number;
  /** Paywall index (null if no paywall) */
  paywallIndex: number | null;
  /** Whether user has premium access */
  hasPremiumAccess: boolean;
  /** Persisted progress (if any) */
  progress?: CarouselProgress | null;
  /** Whether progress is still loading from localStorage */
  progressLoading?: boolean;
}

/** Module display info for rendering */
interface ModuleDisplayInfo {
  slug: string;
  title: string;
  type: Module["type"];
  isPremium: boolean;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  itemCount: number;
  completedItemCount: number;
}

/**
 * Calculate progress percentage
 */
function calculateProgressPercentage(
  completedItems: string[],
  totalItems: number
): number {
  if (totalItems === 0) return 0;
  return Math.round((completedItems.length / totalItems) * 100);
}

/**
 * Find current module based on progress
 */
function findCurrentModule(
  modules: Module[],
  completedItems: Set<string>,
  currentIndex: number
): Module | null {
  // If we have a current index, find which module it belongs to
  // For simplicity, iterate through modules and track cumulative item counts
  let cumulativeIndex = 0;

  for (const mod of modules) {
    const moduleItemCount = getModuleItemCount(mod);
    const moduleEndIndex = cumulativeIndex + moduleItemCount;

    if (currentIndex < moduleEndIndex) {
      return mod;
    }
    cumulativeIndex = moduleEndIndex;
  }

  // Default to first module if no match
  return modules.length > 0 ? modules[0] ?? null : null;
}

/**
 * Get item count for a module (including title item)
 */
function getModuleItemCount(mod: Module): number {
  // +1 for the module title item
  return (
    mod.sections.reduce((total, section) => total + section.blocks.length, 0) +
    1
  );
}

/**
 * Build module display info list
 */
function buildModuleDisplayInfo(
  modules: Module[],
  completedItems: Set<string>,
  currentIndex: number,
  hasPremiumAccess: boolean
): ModuleDisplayInfo[] {
  const result: ModuleDisplayInfo[] = [];
  let cumulativeIndex = 0;

  for (const mod of modules) {
    const moduleItemCount = getModuleItemCount(mod);
    const moduleStartIndex = cumulativeIndex;
    const moduleEndIndex = cumulativeIndex + moduleItemCount;

    // Check if this module is locked (premium but no access)
    const isLocked = mod.isPremium && !hasPremiumAccess;

    // Check if this module is current (contains current index)
    const isCurrent =
      currentIndex >= moduleStartIndex && currentIndex < moduleEndIndex;

    // Count completed items in this module
    let completedItemCount = 0;
    if (!isLocked) {
      // Generate item IDs for this module and count completed ones
      // Must match the ID generation in flatten-modules.ts

      // Module title: `${mod.slug}-title`
      if (completedItems.has(`${mod.slug}-title`)) {
        completedItemCount++;
      }

      // Track item index within module (starts at 1 after title)
      let moduleItemIndex = 1;

      // Section blocks: ID depends on whether block has explicit id
      for (const section of mod.sections) {
        for (const block of section.blocks) {
          // Match flatten-modules.ts ID generation:
          // blockId = block.id || `${mod.slug}-${section.id}-${items.length}`
          // itemId = `${mod.slug}-${blockId}`
          const blockId = block.id || `${mod.slug}-${section.id}-${moduleItemIndex}`;
          const itemId = `${mod.slug}-${blockId}`;
          if (completedItems.has(itemId)) {
            completedItemCount++;
          }
          moduleItemIndex++;
        }
      }
    }

    // Check if module is fully completed
    const isCompleted = !isLocked && completedItemCount >= moduleItemCount;

    result.push({
      slug: mod.slug,
      title: mod.title,
      type: mod.type,
      isPremium: mod.isPremium,
      isLocked,
      isCompleted,
      isCurrent,
      itemCount: moduleItemCount,
      completedItemCount,
    });

    cumulativeIndex = moduleEndIndex;
  }

  return result;
}

export function JourneyProgress({
  companySlug,
  roleSlug,
  companyName,
  roleName,
  allModules,
  totalItems,
  paywallIndex,
  hasPremiumAccess,
  progress,
  progressLoading = false,
}: JourneyProgressProps) {
  // Extract progress values with defaults
  const currentIndex = progress?.currentIndex ?? 0;
  const completedItems = useMemo(
    () => new Set(progress?.completedItems ?? []),
    [progress?.completedItems]
  );

  // Calculate overall progress percentage
  const progressPercentage = useMemo(
    () =>
      calculateProgressPercentage(
        progress?.completedItems ?? [],
        totalItems
      ),
    [progress?.completedItems, totalItems]
  );

  // Find current module
  const currentModule = useMemo(
    () => findCurrentModule(allModules, completedItems, currentIndex),
    [allModules, completedItems, currentIndex]
  );

  // Build module display info
  const moduleDisplayInfo = useMemo(
    () =>
      buildModuleDisplayInfo(
        allModules,
        completedItems,
        currentIndex,
        hasPremiumAccess
      ),
    [allModules, completedItems, currentIndex, hasPremiumAccess]
  );

  // Determine button text and state
  // While loading, show "Continue" to prevent flicker (most users viewing this have progress)
  const hasStarted = currentIndex > 0 || completedItems.size > 0;
  const isComplete = progressPercentage === 100;
  const buttonText = progressLoading
    ? "Continue"
    : isComplete
      ? "Review Journey"
      : hasStarted
        ? "Continue"
        : "Start Journey";

  return (
    <div className="space-y-6">
      {/* Progress Overview Card */}
      <div
        className="bg-white shadow rounded-lg p-6"
        data-testid="journey-progress-card"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Your Progress
            </h2>
            {!progressLoading && currentModule && (
              <p
                className="text-sm text-gray-500 mt-1"
                data-testid="current-module-name"
              >
                Current:{" "}
                <span className="font-medium text-gray-700">
                  {currentModule.title}
                </span>
              </p>
            )}
          </div>
          <span
            className="text-2xl font-bold text-blue-600"
            data-testid="progress-percentage"
            aria-label={progressLoading ? "Loading progress" : `${progressPercentage}% complete`}
          >
            {progressLoading ? "-" : `${progressPercentage}%`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div
            className="w-full bg-gray-200 rounded-full h-3"
            role="progressbar"
            aria-valuenow={progressLoading ? 0 : progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressLoading ? "Loading progress" : `Journey progress: ${progressPercentage}% complete`}
          >
            {!progressLoading && (
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {progressLoading ? "Loading..." : `${completedItems.size} of ${totalItems} items complete`}
          </p>
        </div>

        {/* Continue button */}
        <Link
          href={`/${companySlug}/${roleSlug}/journey/learn`}
          className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          data-testid="continue-button"
        >
          {buttonText}
          <svg
            className="ml-2 w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>

      {/* Module List */}
      <div
        className="bg-white shadow rounded-lg p-6"
        data-testid="module-list"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Journey Modules
        </h2>
        <div className="space-y-3">
          {moduleDisplayInfo.map((moduleInfo, index) => (
            <ModuleListItem
              key={moduleInfo.slug}
              moduleInfo={moduleInfo}
              index={index}
              companySlug={companySlug}
              roleSlug={roleSlug}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Props for ModuleListItem */
interface ModuleListItemProps {
  moduleInfo: ModuleDisplayInfo;
  index: number;
  companySlug: string;
  roleSlug: string;
}

/** Individual module list item */
function ModuleListItem({
  moduleInfo,
  index,
  companySlug,
  roleSlug,
}: ModuleListItemProps) {
  const {
    title,
    type,
    isPremium,
    isLocked,
    isCompleted,
    isCurrent,
    itemCount,
    completedItemCount,
  } = moduleInfo;

  // Determine item styling based on state
  let containerClasses =
    "flex items-center p-3 rounded-lg border transition-colors";
  let iconContainerClasses =
    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3";

  if (isCompleted) {
    containerClasses += " bg-green-50 border-green-200";
    iconContainerClasses += " bg-green-600 text-white";
  } else if (isCurrent) {
    containerClasses += " bg-blue-50 border-blue-200";
    iconContainerClasses += " bg-blue-600 text-white";
  } else if (isLocked) {
    containerClasses += " bg-gray-50 border-gray-100 opacity-75";
    iconContainerClasses += " bg-gray-300 text-gray-500";
  } else {
    containerClasses += " bg-gray-50 border-gray-200";
    iconContainerClasses += " bg-gray-300 text-gray-600";
  }

  // Module type badge styling
  const getTypeBadge = () => {
    switch (type) {
      case "universal":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
            FREE
          </span>
        );
      case "company":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
            COMPANY
          </span>
        );
      case "role":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-800">
            ROLE
          </span>
        );
      case "company-role":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
            TARGETED
          </span>
        );
      default:
        return null;
    }
  };

  // Progress text
  const progressText = isLocked
    ? "Locked"
    : isCompleted
      ? "Complete"
      : `${completedItemCount}/${itemCount}`;

  return (
    <div className={containerClasses} data-testid={`module-item-${index}`}>
      {/* Icon */}
      <div className={iconContainerClasses}>
        {isCompleted ? (
          <CheckIcon className="w-5 h-5" />
        ) : isLocked ? (
          <LockIcon className="w-4 h-4" data-testid={`lock-icon-${index}`} />
        ) : (
          <span className="text-sm font-medium">{index + 1}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={`text-sm font-medium truncate ${isLocked ? "text-gray-400" : "text-gray-900"}`}
          >
            {title}
          </h3>
          {isPremium && (
            <span
              className="text-xs text-gray-400"
              aria-label="Premium content"
            >
              <LockIcon className="w-3 h-3 inline" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {getTypeBadge()}
          <span
            className={`text-xs ${isLocked ? "text-gray-400" : "text-gray-500"}`}
          >
            {progressText}
          </span>
        </div>
      </div>

      {/* Current indicator */}
      {isCurrent && !isCompleted && (
        <span className="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full bg-blue-600 text-white">
          Current
        </span>
      )}
    </div>
  );
}

export default JourneyProgress;
