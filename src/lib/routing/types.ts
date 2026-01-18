/**
 * Types for routing and company/role data
 */

export interface CompanyRole {
  name: string;
  slug: string;
  volume: number;
}

export interface CompanyData {
  name: string;
  slug: string;
  category: string;
  interview_volume: number;
  roles: CompanyRole[];
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
