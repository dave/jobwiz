"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CompanyData } from "@/lib/routing/types";

interface InterviewSelectorProps {
  companies: CompanyData[];
}

export function InterviewSelector({ companies }: InterviewSelectorProps) {
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  // Get available roles for selected company
  const availableRoles = useMemo(() => {
    if (!selectedCompany) return [];
    const company = companies.find((c) => c.slug === selectedCompany);
    return company?.roles ?? [];
  }, [selectedCompany, companies]);

  // Reset role when company changes
  const handleCompanyChange = (companySlug: string) => {
    setSelectedCompany(companySlug);
    setSelectedRole("");
  };

  const handleSubmit = () => {
    if (selectedCompany && selectedRole) {
      router.push(`/${selectedCompany}/${selectedRole}`);
    }
  };

  const isValid = selectedCompany && selectedRole;

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {/* Company dropdown */}
      <div className="text-left">
        <label
          htmlFor="company"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Company
        </label>
        <select
          id="company"
          value={selectedCompany}
          onChange={(e) => handleCompanyChange(e.target.value)}
          className="w-full px-4 py-3.5 text-base text-gray-900 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            backgroundSize: "20px",
          }}
        >
          <option value="">Select a company...</option>
          {companies.map((company) => (
            <option key={company.slug} value={company.slug}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {/* Role dropdown */}
      <div className="text-left">
        <label
          htmlFor="role"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Role
        </label>
        <select
          id="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          disabled={!selectedCompany}
          className="w-full px-4 py-3.5 text-base text-gray-900 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            backgroundSize: "20px",
          }}
        >
          <option value="">
            {selectedCompany ? "Select a role..." : "Select a company first"}
          </option>
          {availableRoles.map((role) => (
            <option key={role.slug} value={role.slug}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!isValid}
        className="w-full inline-flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-full bg-blue-600 text-white hover:opacity-90 transition-opacity disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed mt-2"
      >
        Start preparing
        <svg
          className="ml-2 w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
