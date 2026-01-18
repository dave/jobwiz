import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompanyBySlug, getRoleBySlug } from "@/lib/routing";
import { JourneyContent } from "./JourneyContent";

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
      title: "Not Found | JobWiz",
    };
  }

  const title = `${company.name} ${role.name} Interview Journey | JobWiz`;
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

  return (
    <JourneyContent
      companySlug={companySlug}
      roleSlug={roleSlug}
      companyName={company.name}
      roleName={role.name}
    />
  );
}
