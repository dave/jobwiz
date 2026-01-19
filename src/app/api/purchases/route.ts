/**
 * API route for fetching user purchases
 * Returns list of access grants for the authenticated user
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getUserAccessGrants } from "@/lib/access/storage";
import { getCompanyBySlug, getRoleBySlug } from "@/lib/routing";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active access grants for the user
    const grants = await getUserAccessGrants(supabase, user.id, false);

    // Enrich with company/role names
    const purchases = grants
      .filter(grant => grant.source === "purchase") // Only show actual purchases
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

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}
