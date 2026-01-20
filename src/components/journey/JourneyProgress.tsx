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
}

/** Module display info for rendering */
interface ModuleDisplayInfo {
  slug: string;
  title: string;
  isPremium: boolean;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  itemCount: number;
  completedItemCount: number;
  startIndex: number;
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
  let hasSeenPremium = false;

  // Check if there are any premium modules (which means there's a paywall)
  const hasPremiumModules = modules.some((m) => m.isPremium);

  for (const mod of modules) {
    // Account for paywall item when transitioning from free to premium modules
    if (hasPremiumModules && mod.isPremium && !hasSeenPremium) {
      hasSeenPremium = true;
      cumulativeIndex += 1; // Add 1 for the paywall item
    }

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
      isPremium: mod.isPremium,
      isLocked,
      isCompleted,
      isCurrent,
      itemCount: moduleItemCount,
      completedItemCount,
      startIndex: moduleStartIndex,
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

  // Determine button text and state based on progress
  const hasStarted = currentIndex > 0 || completedItems.size > 0;
  const isComplete = progressPercentage === 100;
  const buttonText = isComplete
    ? "Review Journey"
    : hasStarted
      ? "Continue"
      : "Start Journey";

  // Calculate circumference for progress ring (radius = 40)
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div data-testid="journey-progress-card">
      {/* Compact header with progress ring */}
      <div className="flex items-center gap-6 mb-8 p-6 bg-white rounded-2xl shadow-sm">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#2563eb"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-lg font-bold text-gray-900"
              data-testid="progress-percentage"
              aria-label={`${progressPercentage}% complete`}
            >
              {progressPercentage}%
            </span>
          </div>
        </div>

        {/* Text and CTA */}
        <div className="flex-grow">
          <p
            className="text-gray-900 font-medium mb-1"
            data-testid="current-module-name"
          >
            {currentModule?.title || "Your Journey"}
          </p>
          <p className="text-gray-500 text-sm mb-3">
            {completedItems.size === 0
              ? "Ready when you are"
              : `${completedItems.size} of ${totalItems} complete`}
          </p>
          <Link
            href={`/${companySlug}/${roleSlug}/journey/learn`}
            className="inline-flex items-center text-blue-600 font-medium text-sm hover:text-blue-700 transition-colors"
            data-testid="continue-button"
          >
            {buttonText}
            <svg
              className="ml-1 w-4 h-4"
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
      </div>

      {/* Module cards */}
      <div className="grid gap-3" data-testid="module-list">
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
  );
}

/** Props for ModuleListItem */
interface ModuleListItemProps {
  moduleInfo: ModuleDisplayInfo;
  index: number;
  companySlug: string;
  roleSlug: string;
}

/** Individual module card */
function ModuleListItem({
  moduleInfo,
  index,
  companySlug,
  roleSlug,
}: ModuleListItemProps) {
  const {
    title,
    isPremium,
    isLocked,
    isCompleted,
    isCurrent: isCurrentFromProgress,
    itemCount,
    completedItemCount,
    startIndex,
  } = moduleInfo;

  const isCurrent = isCurrentFromProgress;
  const moduleProgress = itemCount > 0 ? Math.round((completedItemCount / itemCount) * 100) : 0;

  const href = isLocked
    ? `/${companySlug}/${roleSlug}/checkout`
    : `/${companySlug}/${roleSlug}/journey/learn?start=${startIndex}`;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 p-4 bg-white rounded-xl transition-all ${
        isCompleted
          ? "ring-1 ring-green-200 hover:ring-green-300"
          : isCurrent
            ? "ring-2 ring-blue-500 shadow-sm"
            : isLocked
              ? "opacity-60 hover:opacity-100"
              : "hover:shadow-md"
      }`}
      data-testid={`module-item-${index}`}
    >
      {/* Status icon */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isCompleted
            ? "bg-green-100 text-green-600"
            : isCurrent
              ? "bg-blue-100 text-blue-600"
              : isLocked
                ? "bg-gray-100 text-gray-400"
                : "bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500"
        }`}
      >
        {isCompleted ? (
          <CheckIcon className="w-5 h-5" />
        ) : isLocked ? (
          <LockIcon className="w-4 h-4" data-testid={`lock-icon-${index}`} />
        ) : (
          <span className="text-sm font-semibold">{index + 1}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0">
        <h3
          className={`font-medium truncate ${
            isCompleted
              ? "text-green-700"
              : isCurrent
                ? "text-gray-900"
                : isLocked
                  ? "text-gray-400"
                  : "text-gray-700"
          }`}
        >
          {title}
        </h3>

        {/* Progress indicator */}
        {!isLocked && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-grow max-w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isCompleted ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${isCompleted ? 100 : moduleProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {completedItemCount}/{itemCount}
            </span>
          </div>
        )}
      </div>

      {/* Arrow / action hint */}
      <div className="flex-shrink-0">
        {isLocked ? (
          <span className="text-xs font-medium text-blue-600 group-hover:text-blue-700">
            Unlock
          </span>
        ) : (
          <svg
            className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-transform group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </Link>
  );
}

export default JourneyProgress;
