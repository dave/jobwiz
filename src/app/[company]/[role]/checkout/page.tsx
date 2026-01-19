import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { validateCompanyRoleRoute } from "@/lib/routing";
import { CheckoutContent } from "./CheckoutContent";

interface CheckoutPageProps {
  params: Promise<{
    company: string;
    role: string;
  }>;
}

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const { company: companySlug, role: roleSlug } = await params;
  const result = validateCompanyRoleRoute(companySlug, roleSlug);

  if (!result.isValid || !result.company || !result.role) {
    return {
      title: "Checkout | Ace That Interview",
      robots: { index: false, follow: false },
    };
  }

  const { company, role } = result;
  return {
    title: `Unlock ${company.name} ${role.name} Prep | Ace That Interview`,
    description: `Get full access to ${company.name} ${role.name} interview preparation with company-specific questions, insider tips, and practice materials.`,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { company: companySlug, role: roleSlug } = await params;
  const result = validateCompanyRoleRoute(companySlug, roleSlug);

  if (!result.isValid || !result.company || !result.role) {
    notFound();
  }

  if (result.needsRedirect && result.canonicalPath) {
    redirect(`${result.canonicalPath}/checkout`);
  }

  const { company, role } = result;

  return (
    <CheckoutContent
      companySlug={company.slug}
      companyName={company.name}
      roleSlug={role.slug}
      roleName={role.name}
    />
  );
}
