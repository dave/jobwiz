/**
 * Module matrix functions for assembling courses from modular content
 * Determines which modules apply to a given company/role position
 */

import type { Module, ModuleType, Company, Role } from "@/types";

/** Order of module types from general to specific */
const MODULE_TYPE_ORDER: ModuleType[] = [
  "universal",
  "industry",
  "role",
  "company",
  "company-role",
];

/** Registry of all available modules indexed by type */
export interface ModuleRegistry {
  universal: Module[];
  industry: Module[];
  role: Module[];
  company: Module[];
  "company-role": Module[];
}

/** Create an empty module registry */
export function createEmptyRegistry(): ModuleRegistry {
  return {
    universal: [],
    industry: [],
    role: [],
    company: [],
    "company-role": [],
  };
}

/**
 * Get all modules that apply to a given position, in display order
 *
 * Returns modules in strict order:
 * 1. universal - applies to all interviews
 * 2. industry - applies to all companies in that industry
 * 3. role - applies to all positions of that role type
 * 4. company - applies to all roles at that company
 * 5. company-role - specific to this exact company+role combo
 *
 * Within each type, modules are sorted by their `order` field
 */
export function getModulesForPosition(
  company: Company,
  role: Role,
  registry: ModuleRegistry
): Module[] {
  const result: Module[] = [];

  // 1. Universal modules - apply to everyone
  const universalModules = [...registry.universal].sort(
    (a, b) => a.order - b.order
  );
  result.push(...universalModules);

  // 2. Industry modules - match company's industry
  const industryModules = registry.industry
    .filter((m) => m.industry === company.industry)
    .sort((a, b) => a.order - b.order);
  result.push(...industryModules);

  // 3. Role modules - match role's category
  const roleModules = registry.role
    .filter((m) => m.roleCategory === role.category)
    .sort((a, b) => a.order - b.order);
  result.push(...roleModules);

  // 4. Company modules - match company slug
  const companyModules = registry.company
    .filter((m) => m.companySlug === company.slug)
    .sort((a, b) => a.order - b.order);
  result.push(...companyModules);

  // 5. Company-role modules - match both company and role
  const companyRoleModules = registry["company-role"]
    .filter((m) => m.companySlug === company.slug && m.roleSlug === role.slug)
    .sort((a, b) => a.order - b.order);
  result.push(...companyRoleModules);

  return result;
}

/** Result of splitting modules by access level */
export interface SplitModules {
  free: Module[];
  premium: Module[];
}

/**
 * Split an array of modules into free and premium groups
 * Maintains the original order within each group
 */
export function splitByAccess(modules: Module[]): SplitModules {
  const free: Module[] = [];
  const premium: Module[] = [];

  for (const mod of modules) {
    if (mod.isPremium) {
      premium.push(mod);
    } else {
      free.push(mod);
    }
  }

  return { free, premium };
}

/** Get the order index for a module type (for sorting) */
export function getModuleTypeOrder(type: ModuleType): number {
  const index = MODULE_TYPE_ORDER.indexOf(type);
  return index === -1 ? MODULE_TYPE_ORDER.length : index;
}
