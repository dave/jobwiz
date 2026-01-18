/**
 * Types for routing and company/role data
 */

export interface CompanyRole {
  name: string;
  slug: string;
  volume: number;
}

export interface RoleType {
  name: string;
  slug: string;
}

export interface CompanyData {
  name: string;
  slug: string;
  category: string;
  interview_volume: number;
  roles: CompanyRole[];
}

/**
 * Raw JSON structure from search_volume.json
 */
export interface RawSearchVolumeData {
  generated_at: string;
  geography: string;
  status: string;
  role_types: RoleType[];
  companies: Array<{
    name: string;
    slug: string;
    category: string;
    interview_volume: number;
    roles: string[]; // Role slugs
  }>;
  priority_list: Array<{
    company: string;
    role: string | null;
    score: number;
  }>;
}

export interface SearchVolumeData {
  generated_at: string;
  geography: string;
  status: string;
  companies: CompanyData[];
  priority_list: Array<{
    company: string;
    role: string | null;
    score: number;
  }>;
}

export interface RouteValidationResult {
  isValid: boolean;
  company: CompanyData | null;
  role: CompanyRole | null;
  canonicalPath: string | null;
  needsRedirect: boolean;
}
