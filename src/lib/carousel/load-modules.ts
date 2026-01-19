/**
 * Module loader for carousel
 * Loads and orders modules for a company/role pair
 */

import { Module, ModuleType } from "@/types/module";
import fs from "fs";
import path from "path";

/**
 * Result of loading carousel modules
 */
export interface CarouselModulesResult {
  /** Free modules (universal) - before paywall */
  freeModules: Module[];
  /** Premium modules (company, role, company-role) - after paywall */
  premiumModules: Module[];
  /** All modules in order */
  allModules: Module[];
}

/**
 * Module order priority for carousel
 * Industry modules are skipped per Stage 8 spec
 */
const MODULE_ORDER: ModuleType[] = [
  "universal",
  "company",
  "role",
  "company-role",
];

/**
 * Get the modules directory path
 */
function getModulesDir(): string {
  return path.join(process.cwd(), "data", "generated", "modules");
}

/**
 * Parse a JSON module file and convert to Module interface
 */
function parseModuleFile(filePath: string): Module | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as Record<string, unknown>;

    // Map JSON fields to Module interface
    return {
      id: (data.slug as string) || "",
      slug: (data.slug as string) || "",
      type: (data.type as ModuleType) || "universal",
      title: (data.title as string) || "",
      description: data.description as string | undefined,
      sections: (data.sections as Module["sections"]) || [],
      isPremium: (data.is_premium as boolean) || false,
      order: (data.display_order as number) || 0,
      industry: data.industry as string | undefined,
      roleCategory: data.role_category as string | undefined,
      companySlug: data.company_slug as string | undefined,
      roleSlug: data.role_slug as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Load all universal modules
 */
function loadUniversalModules(modulesDir: string): Module[] {
  const modules: Module[] = [];
  const files = fs.readdirSync(modulesDir);

  for (const file of files) {
    if (file.startsWith("universal-") && file.endsWith(".json")) {
      const parsedMod = parseModuleFile(path.join(modulesDir, file));
      if (parsedMod && parsedMod.type === "universal") {
        modules.push(parsedMod);
      }
    }
  }

  return modules.sort((a, b) => a.order - b.order);
}

/**
 * Load company module for a specific company
 */
function loadCompanyModule(
  modulesDir: string,
  companySlug: string
): Module | null {
  const fileName = `company-${companySlug}.json`;
  const filePath = path.join(modulesDir, fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const parsedMod = parseModuleFile(filePath);
  if (parsedMod && parsedMod.type === "company" && parsedMod.companySlug === companySlug) {
    return parsedMod;
  }

  return null;
}

/**
 * Load role module for a specific role
 */
function loadRoleModule(modulesDir: string, roleSlug: string): Module | null {
  const fileName = `role-${roleSlug}.json`;
  const filePath = path.join(modulesDir, fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const parsedMod = parseModuleFile(filePath);
  if (parsedMod && parsedMod.type === "role" && parsedMod.roleSlug === roleSlug) {
    return parsedMod;
  }

  return null;
}

/**
 * Load company-role module for a specific company/role pair
 */
function loadCompanyRoleModule(
  modulesDir: string,
  companySlug: string,
  roleSlug: string
): Module | null {
  const fileName = `company-role-${companySlug}-${roleSlug}.json`;
  const filePath = path.join(modulesDir, fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const parsedMod = parseModuleFile(filePath);
  if (
    parsedMod &&
    parsedMod.type === "company-role" &&
    parsedMod.companySlug === companySlug &&
    parsedMod.roleSlug === roleSlug
  ) {
    return parsedMod;
  }

  return null;
}

/**
 * Load and order modules for a company/role pair
 *
 * @param companySlug - Company slug (e.g., "google")
 * @param roleSlug - Role slug (e.g., "software-engineer")
 * @returns Object with freeModules (universal) and premiumModules (company, role, company-role)
 */
export function loadCarouselModules(
  companySlug: string,
  roleSlug: string
): CarouselModulesResult {
  const modulesDir = getModulesDir();
  const allModules: Module[] = [];

  // 1. Load universal modules (FREE)
  const universalModules = loadUniversalModules(modulesDir);
  allModules.push(...universalModules);

  // 2. Load company module (PREMIUM)
  const companyModule = loadCompanyModule(modulesDir, companySlug);
  if (companyModule) {
    allModules.push(companyModule);
  }

  // 3. Load role module (PREMIUM)
  const roleModule = loadRoleModule(modulesDir, roleSlug);
  if (roleModule) {
    allModules.push(roleModule);
  }

  // 4. Load company-role module (PREMIUM)
  const companyRoleModule = loadCompanyRoleModule(
    modulesDir,
    companySlug,
    roleSlug
  );
  if (companyRoleModule) {
    allModules.push(companyRoleModule);
  }

  // Split into free (universal) and premium (everything else)
  const freeModules = allModules.filter((m) => m.type === "universal");
  const premiumModules = allModules.filter((m) => m.type !== "universal");

  return {
    freeModules,
    premiumModules,
    allModules,
  };
}

/**
 * Check if a module file exists for a company/role pair
 */
export function hasCompanyRoleModule(
  companySlug: string,
  roleSlug: string
): boolean {
  const modulesDir = getModulesDir();
  const fileName = `company-role-${companySlug}-${roleSlug}.json`;
  const filePath = path.join(modulesDir, fileName);
  return fs.existsSync(filePath);
}

/**
 * Get module order index for sorting
 */
export function getModuleOrderIndex(type: ModuleType): number {
  const index = MODULE_ORDER.indexOf(type);
  return index === -1 ? MODULE_ORDER.length : index;
}
