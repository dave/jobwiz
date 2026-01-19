import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompanyBySlug, getRoleBySlug } from "@/lib/routing";
import { loadCarouselModules } from "@/lib/carousel";
import { flattenToCarouselItems } from "@/lib/carousel/flatten-modules";
import { JourneyContent } from "./JourneyContent";
import { createServerClient } from "@/lib/supabase/server";
import { checkAccess } from "@/lib/access";

interface JourneyPageProps {
  params: Promise<{
    company: string;
    role: string;
  }>;
}

export async function generateMetadata({
  params,
}: JourneyPageProps): Promise<Metadata> {
  const { company: companySlug, role: roleSlug } = await params;

  const company = getCompanyBySlug(companySlug);
  const role = company ? getRoleBySlug(company, roleSlug) : null;

  if (!company || !role) {
    return {
      title: "Not Found | Ace That Interview",
    };
  }

  const title = `${company.name} ${role.name} Interview Journey | Ace That Interview`;
  const description = `Complete your ${company.name} ${role.name} interview preparation with our step-by-step guide.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function JourneyPage({ params }: JourneyPageProps) {
  const { company: companySlug, role: roleSlug } = await params;

  // Validate company and role exist
  const company = getCompanyBySlug(companySlug);
  const role = company ? getRoleBySlug(company, roleSlug) : null;

  if (!company || !role) {
    notFound();
  }

  // Load carousel modules for this company/role
  const { freeModules, premiumModules, allModules } = loadCarouselModules(
    companySlug,
    roleSlug
  );

  // Flatten modules to get item counts
  const { totalItems, paywallIndex } = flattenToCarouselItems(
    freeModules,
    premiumModules
  );

  // Check access server-side to prevent flicker
  let initialHasAccess = false;
  let isLoggedIn = false;
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const result = await checkAccess(supabase, user.id, companySlug, roleSlug);
      initialHasAccess = result.hasAccess;
    }
  } catch {
    // Fail silently - client will re-check
  }

  return (
    <JourneyContent
      companySlug={companySlug}
      roleSlug={roleSlug}
      companyName={company.name}
      roleName={role.name}
      allModules={allModules}
      totalItems={totalItems}
      paywallIndex={paywallIndex}
      initialHasAccess={initialHasAccess}
      isLoggedIn={isLoggedIn}
    />
  );
}
