/**
 * Flatten modules to carousel items
 * Converts hierarchical module/section/block structure to flat CarouselItem array
 */

import type { Module, ContentBlock, ContentBlockType } from "@/types/module";
import type { CarouselItem, CarouselItemType } from "@/types/carousel";

/**
 * Result of flattening modules
 */
export interface FlattenResult {
  /** All carousel items in order */
  items: CarouselItem[];
  /** Index where paywall appears (null if no premium content) */
  paywallIndex: number | null;
  /** Total number of items */
  totalItems: number;
}

/**
 * Special content block for module title items
 */
interface ModuleTitleBlock {
  id: string;
  type: "header";
  content: string;
  level: 1;
}

/**
 * Special content block for paywall items
 */
interface PaywallBlock {
  id: string;
  type: "text";
  content: string;
}

/**
 * Map ContentBlockType to CarouselItemType
 */
function mapBlockTypeToCarouselType(blockType: ContentBlockType): CarouselItemType {
  switch (blockType) {
    case "quiz":
      return "quiz";
    case "checklist":
      return "checklist";
    default:
      return "content";
  }
}

/**
 * Extract the text content from a block for creating content blocks
 * Handles both string content and object content formats
 */
function extractBlockContent(block: ContentBlock): ContentBlock {
  // If block.content is an object (from JSON), we need to normalize it
  const rawBlock = block as unknown as Record<string, unknown>;

  if (rawBlock.content && typeof rawBlock.content === "object") {
    const contentObj = rawBlock.content as Record<string, unknown>;

    // Handle different block types
    switch (block.type) {
      case "text":
      case "tip":
      case "warning":
        return {
          id: block.id,
          type: block.type,
          content: (contentObj.text as string) || "",
        } as ContentBlock;

      case "header":
        return {
          id: block.id,
          type: "header",
          content: (contentObj.text as string) || "",
          level: (contentObj.level as 1 | 2 | 3) || 2,
        } as ContentBlock;

      case "quote":
        return {
          id: block.id,
          type: "quote",
          content: (contentObj.text as string) || "",
          author: contentObj.author as string | undefined,
        } as ContentBlock;

      case "quiz":
        return {
          id: block.id,
          type: "quiz",
          question: (contentObj.question as string) || "",
          options: (contentObj.options as Array<{ id: string; text: string; isCorrect: boolean }>) || [],
          multiSelect: contentObj.multiSelect as boolean | undefined,
          explanation: contentObj.explanation as string | undefined,
        } as ContentBlock;

      case "checklist":
        return {
          id: block.id,
          type: "checklist",
          title: contentObj.title as string | undefined,
          items: (contentObj.items as Array<{ id: string; text: string; required?: boolean }>) || [],
        } as ContentBlock;

      case "video":
        return {
          id: block.id,
          type: "video",
          url: (contentObj.url as string) || "",
          title: contentObj.title as string | undefined,
          duration: contentObj.duration as number | undefined,
        } as ContentBlock;

      case "audio":
        return {
          id: block.id,
          type: "audio",
          url: (contentObj.url as string) || "",
          title: contentObj.title as string | undefined,
          duration: contentObj.duration as number | undefined,
        } as ContentBlock;

      case "image":
        return {
          id: block.id,
          type: "image",
          url: (contentObj.url as string) || "",
          alt: (contentObj.alt as string) || "",
          caption: contentObj.caption as string | undefined,
        } as ContentBlock;

      case "infographic":
        return {
          id: block.id,
          type: "infographic",
          url: (contentObj.url as string) || "",
          alt: (contentObj.alt as string) || "",
          caption: contentObj.caption as string | undefined,
        } as ContentBlock;

      case "animation":
        return {
          id: block.id,
          type: "animation",
          animationUrl: (contentObj.animationUrl as string) || "",
          loop: contentObj.loop as boolean | undefined,
          autoplay: contentObj.autoplay as boolean | undefined,
        } as ContentBlock;
    }
  }

  // Block is already in the correct format
  return block;
}

/**
 * Create a module title item
 */
function createModuleTitleItem(
  mod: Module,
  order: number
): CarouselItem {
  const titleBlock: ModuleTitleBlock = {
    id: `${mod.slug}-title`,
    type: "header",
    content: mod.title,
    level: 1,
  };

  return {
    id: `${mod.slug}-title`,
    type: "content",
    content: titleBlock as unknown as ContentBlock,
    moduleSlug: mod.slug,
    isPremium: mod.isPremium,
    sectionTitle: mod.title,
    order,
  };
}

/**
 * Create a paywall item
 */
function createPaywallItem(order: number): CarouselItem {
  const paywallBlock: PaywallBlock = {
    id: "paywall",
    type: "text",
    content: "Unlock premium content to continue your preparation journey.",
  };

  return {
    id: "paywall",
    type: "paywall",
    content: paywallBlock as unknown as ContentBlock,
    moduleSlug: "paywall",
    isPremium: false, // The paywall item itself is not premium
    sectionTitle: "Premium Content",
    order,
  };
}

/**
 * Flatten a single module's content into carousel items
 */
function flattenModule(
  mod: Module,
  startOrder: number
): CarouselItem[] {
  const items: CarouselItem[] = [];
  let currentOrder = startOrder;

  // Add module title item
  items.push(createModuleTitleItem(mod, currentOrder));
  currentOrder++;

  // Process each section
  for (const section of mod.sections) {
    // Process each block in the section
    for (const block of section.blocks) {
      // Generate an ID for blocks that don't have one
      const blockId = block.id || `${mod.slug}-${section.id}-${items.length}`;

      // Normalize the block content
      const normalizedBlock = extractBlockContent({
        ...block,
        id: blockId,
      });

      const item: CarouselItem = {
        id: `${mod.slug}-${blockId}`,
        type: mapBlockTypeToCarouselType(block.type),
        content: normalizedBlock,
        moduleSlug: mod.slug,
        isPremium: mod.isPremium,
        sectionTitle: section.title,
        order: currentOrder,
      };

      items.push(item);
      currentOrder++;
    }
  }

  return items;
}

/**
 * Flatten modules to carousel items
 *
 * @param freeModules - Modules that are free (before paywall)
 * @param premiumModules - Modules that require payment (after paywall)
 * @returns FlattenResult with all items, paywall index, and total count
 */
export function flattenToCarouselItems(
  freeModules: Module[],
  premiumModules: Module[]
): FlattenResult {
  const items: CarouselItem[] = [];
  let currentOrder = 0;

  // Flatten free modules first
  for (const freeMod of freeModules) {
    const moduleItems = flattenModule(freeMod, currentOrder);
    items.push(...moduleItems);
    currentOrder += moduleItems.length;
  }

  // Determine paywall index
  let paywallIndex: number | null = null;

  // Only add paywall if there are premium modules
  if (premiumModules.length > 0) {
    paywallIndex = currentOrder;
    items.push(createPaywallItem(currentOrder));
    currentOrder++;
  }

  // Flatten premium modules after paywall
  for (const premiumMod of premiumModules) {
    const moduleItems = flattenModule(premiumMod, currentOrder);
    items.push(...moduleItems);
    currentOrder += moduleItems.length;
  }

  return {
    items,
    paywallIndex,
    totalItems: items.length,
  };
}

/**
 * Get the number of blocks in a module (excluding title)
 */
export function getModuleBlockCount(mod: Module): number {
  return mod.sections.reduce((total, section) => total + section.blocks.length, 0);
}

/**
 * Get the total number of items a module will produce (including title)
 */
export function getModuleItemCount(mod: Module): number {
  return getModuleBlockCount(mod) + 1; // +1 for title
}
