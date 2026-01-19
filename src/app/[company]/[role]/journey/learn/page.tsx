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
}

export default async function LearnPage({ params }: LearnPageProps) {
  const { company: companySlug, role: roleSlug } = await params;

  // Validate company and role exist
  const company = getCompanyBySlug(companySlug);
  const role = company ? getRoleBySlug(company, roleSlug) : null;

  if (!company || !role) {
    notFound();
  }

  // Check if user has premium access first
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

  // Load modules from filesystem and flatten for carousel
  let flattenedResult = null;
  try {
    const { freeModules, premiumModules } = loadCarouselModules(
      companySlug,
      roleSlug
    );
    const fullResult = flattenToCarouselItems(freeModules, premiumModules);

    // Filter out premium content if user doesn't have access
    // Only send items up to and including the paywall to prevent data leak
    if (!hasPremiumAccess && fullResult.paywallIndex !== null) {
      flattenedResult = {
        items: fullResult.items.slice(0, fullResult.paywallIndex + 1),
        paywallIndex: fullResult.paywallIndex,
        totalItems: fullResult.totalItems, // Keep original total for progress calculation
      };
    } else {
      flattenedResult = fullResult;
    }
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
      hasPremiumAccess={hasPremiumAccess}
    />
  );
}
