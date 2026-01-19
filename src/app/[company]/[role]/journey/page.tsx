import { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCompanyBySlug, getRoleBySlug } from "@/lib/routing";
import { loadCarouselModules } from "@/lib/carousel";
import { flattenToCarouselItems } from "@/lib/carousel/flatten-modules";
import { JourneyContent } from "./JourneyContent";
import { createServerClient } from "@/lib/supabase/server";
import { checkAccess } from "@/lib/access";
import type { CarouselProgress } from "@/types/carousel";

/** Read carousel progress from cookie */
async function getProgressFromCookie(
  companySlug: string,
  roleSlug: string
): Promise<CarouselProgress | null> {
  try {
    const cookieStore = await cookies();
    const cookieName = `carousel_progress_${companySlug}_${roleSlug}`;
    const cookie = cookieStore.get(cookieName);
    if (!cookie?.value) return null;

    const data = JSON.parse(decodeURIComponent(cookie.value));
    return {
      companySlug,
      roleSlug,
      currentIndex: data.currentIndex ?? 0,
      completedItems: data.completedItems ?? [],
      lastUpdated: Date.now(),
    };
  } catch {
    return null;
  }
}

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

  // Read progress from cookie for SSR (prevents flash)
  const initialProgress = await getProgressFromCookie(companySlug, roleSlug);

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
      initialProgress={initialProgress}
    />
  );
}
