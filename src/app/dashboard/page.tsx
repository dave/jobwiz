import { Metadata } from "next";
import { DashboardContent } from "./DashboardContent";
import { createServerClient } from "@/lib/supabase/server";
import { getUserAccessGrants } from "@/lib/access/storage";
import { getCompanyBySlug, getRoleBySlug } from "@/lib/routing";

export const metadata: Metadata = {
  title: "Dashboard | Ace That Interview",
  description: "Your personalized interview prep dashboard",
};

export default async function DashboardPage() {
  // Fetch purchases server-side to avoid flicker
  let initialPurchases: Array<{
    id: string;
    companySlug: string | null;
    roleSlug: string | null;
    companyName: string;
    roleName: string;
    grantedAt: string;
    expiresAt: string;
  }> = [];

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const grants = await getUserAccessGrants(supabase, user.id, false);

      initialPurchases = grants
        .filter(grant => grant.source === "purchase")
        .map(grant => {
          const company = grant.company_slug ? getCompanyBySlug(grant.company_slug) : null;
          const role = company && grant.role_slug ? getRoleBySlug(company, grant.role_slug) : null;

          return {
            id: grant.id,
            companySlug: grant.company_slug,
            roleSlug: grant.role_slug,
            companyName: company?.name ?? (grant.company_slug === null ? "All Companies" : grant.company_slug),
            roleName: role?.name ?? (grant.role_slug === null ? "All Roles" : grant.role_slug),
            grantedAt: grant.granted_at,
            expiresAt: grant.expires_at,
          };
        });
    }
  } catch {
    // Fail silently - client will re-fetch if needed
  }

  return <DashboardContent initialPurchases={initialPurchases} />;
}
