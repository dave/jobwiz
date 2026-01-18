/**
 * Journey Learn Page
 * Issue: #117 - Freemium model with paywall
 *
 * Interactive learning experience using JourneyContainer
 * Loads modules from Supabase and displays them step-by-step
 */

import { notFound } from "next/navigation";
import { getCompanyBySlug, getRoleBySlug } from "@/lib/routing";
import { createServerClient } from "@/lib/supabase/server";
import { getPreviewContent } from "@/lib/content-fetching";
import { LearnContent } from "./LearnContent";

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

  // Fetch content from Supabase
  let content = null;
  try {
    const supabase = await createServerClient();
    content = await getPreviewContent(supabase, companySlug, roleSlug);
  } catch (error) {
    console.error("Error fetching content:", error);
  }

  return (
    <LearnContent
      companySlug={companySlug}
      roleSlug={roleSlug}
      companyName={company.name}
      roleName={role.name}
      initialContent={content}
    />
  );
}
