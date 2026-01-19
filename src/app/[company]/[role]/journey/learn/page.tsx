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
import { createServerClient } from "@/lib/supabase/server";
import { hasAccess } from "@/lib/access";

interface LearnPageProps {
  params: Promise<{
    company: string;
    role: string;
  }>;
  searchParams: Promise<{
    startAt?: string;
  }>;
}

export default async function LearnPage({ params, searchParams }: LearnPageProps) {
  const { company: companySlug, role: roleSlug } = await params;
  const { startAt } = await searchParams;
  const startAtIndex = startAt ? parseInt(startAt, 10) : undefined;

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

  // Check if user has premium access
  let hasPremiumAccess = false;
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      hasPremiumAccess = await hasAccess(supabase, user.id, companySlug, roleSlug);
    }
  } catch (error) {
    console.error("Error checking access:", error);
  }

  return (
    <LearnCarouselContent
      companySlug={companySlug}
      roleSlug={roleSlug}
      companyName={company.name}
      roleName={role.name}
      flattenedResult={flattenedResult}
      hasPremiumAccess={hasPremiumAccess}
      startAtIndex={startAtIndex}
    />
  );
}
