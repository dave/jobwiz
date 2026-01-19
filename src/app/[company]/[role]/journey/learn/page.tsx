/**
 * Journey Learn Page
 * Issue: #135 - C3: Wire up learn page
 *
 * Carousel-based learning experience
 * Loads modules from filesystem and displays them in carousel format
 */

import { notFound } from "next/navigation";
import { getCompanyBySlug, getRoleBySlug } from "@/lib/routing";
import { loadCarouselModules, flattenToCarouselItems } from "@/lib/carousel";
import { LearnCarouselContent } from "./LearnCarouselContent";

interface LearnPageProps {
  params: Promise<{
    company: string;
    role: string;
  }>;
}

export default async function LearnPage({ params }: LearnPageProps) {
  const { company: companySlug, role: roleSlug } = await params;

  // Validate company and role exist
  const company = getCompanyBySlug(companySlug);
  const role = company ? getRoleBySlug(company, roleSlug) : null;

  if (!company || !role) {
    notFound();
  }

  // Load modules from filesystem and flatten for carousel
  let flattenedResult = null;
  try {
    const { freeModules, premiumModules } = loadCarouselModules(
      companySlug,
      roleSlug
    );
    flattenedResult = flattenToCarouselItems(freeModules, premiumModules);
  } catch (error) {
    console.error("Error loading carousel modules:", error);
  }

  return (
    <LearnCarouselContent
      companySlug={companySlug}
      roleSlug={roleSlug}
      companyName={company.name}
      roleName={role.name}
      flattenedResult={flattenedResult}
    />
  );
}
