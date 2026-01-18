/**
 * Position-related type definitions for JobWiz
 * Defines companies, roles, and their categorizations
 */

/** Industries that companies belong to */
export type Industry =
  | "tech"
  | "finance"
  | "consulting"
  | "healthcare"
  | "retail"
  | "other";

/** Categories that roles belong to */
export type RoleCategory =
  | "engineering"
  | "product"
  | "design"
  | "marketing"
  | "sales"
  | "operations"
  | "other";

/** A company that users might interview with */
export interface Company {
  id: string;
  slug: string;
  name: string;
  industry: Industry;
}

/** A role/position type */
export interface Role {
  id: string;
  slug: string;
  name: string;
  category: RoleCategory;
}

/** A specific position at a company (company + role combo) */
export interface Position {
  company: Company;
  role: Role;
}
