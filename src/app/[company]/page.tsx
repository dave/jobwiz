import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import {
  validateCompanyRoute,
  getAllCompanySlugs,
  type CompanyData,
} from "@/lib/routing";
import {
  generateCompanyMetadata,
  generate404Metadata,
  generateOrganizationSchema,
  generateCompanyBreadcrumbs,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo";
import { ThemeProvider, CompanyLogo } from "@/components/theme";
import { getResolvedTheme, type ResolvedTheme, resolveTheme } from "@/lib/theme";
import { createServerClient } from "@/lib/supabase/server";

interface CompanyPageProps {
  params: Promise<{
    company: string;
  }>;
}

/**
 * Generate static params for top companies
 */
export async function generateStaticParams(): Promise<{ company: string }[]> {
  const companySlugs = getAllCompanySlugs();
  return companySlugs.map((company) => ({ company }));
}

/**
 * Generate metadata for company page
 */
export async function generateMetadata({
  params,
}: CompanyPageProps): Promise<Metadata> {
  const { company: companySlug } = await params;
  const result = validateCompanyRoute(companySlug);

  if (!result.isValid || !result.company) {
    return generate404Metadata();
  }

  const { company, canonicalPath } = result;
  return generateCompanyMetadata(company, canonicalPath ?? `/${company.slug}`);
}

function RoleCard({
  company,
  role,
}: {
  company: CompanyData;
  role: { name: string; slug: string; volume: number };
}) {
  return (
    <Link
      href={`/${company.slug}/${role.slug}`}
      className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-[var(--theme-primary,#2563eb)] hover:shadow-md transition-all"
    >
      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
      <p className="text-sm text-gray-500 mt-1">
        Interview prep for {company.name} {role.name}
      </p>
      <span className="inline-block mt-3 text-sm text-[var(--theme-primary,#2563eb)] font-medium">
        Start Prep &rarr;
      </span>
    </Link>
  );
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { company: companySlug } = await params;
  const result = validateCompanyRoute(companySlug);

  // Invalid company - 404
  if (!result.isValid || !result.company) {
    notFound();
  }

  // Case mismatch - redirect to canonical URL
  if (result.needsRedirect && result.canonicalPath) {
    redirect(result.canonicalPath);
  }

  const company = result.company;

  // Fetch theme from Supabase
  let theme: ResolvedTheme;
  try {
    const supabase = await createServerClient();
    theme = await getResolvedTheme(supabase, company.slug);
  } catch {
    // Fallback to default theme if Supabase unavailable
    theme = resolveTheme(company.slug, null);
  }

  // Generate structured data
  const organizationSchema = generateOrganizationSchema();
  const breadcrumbSchema = generateCompanyBreadcrumbs(company);

  return (
    <ThemeProvider theme={theme} as="div">
      {/* JSON-LD Structured Data */}
      <JsonLd data={organizationSchema} />
      <JsonLd data={breadcrumbSchema} />

      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
            <div className="text-center">
              {/* Company Logo */}
              <div className="flex justify-center mb-6">
                <CompanyLogo
                  logoUrl={theme.logoUrl}
                  companyName={company.name}
                  size="large"
                />
              </div>

              {/* Category badge - uses theme colors */}
              <span className="inline-block px-3 py-1 text-xs font-medium text-[var(--theme-primary,#2563eb)] bg-[var(--theme-primary-light,#dbeafe)] rounded-full mb-4">
                {company.category}
              </span>

              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {company.name} Interview Prep
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose your role below to get started with personalized interview
                preparation for {company.name}.
              </p>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Available Roles
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {company.roles.map((role) => (
              <RoleCard key={role.slug} company={company} role={role} />
            ))}
          </div>

          {company.roles.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No roles available for this company yet.
            </p>
          )}
        </section>

        {/* Breadcrumb Navigation */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-[var(--theme-primary,#2563eb)] transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span className="text-gray-900" aria-current="page">{company.name}</span>
              </li>
            </ol>
          </nav>
        </section>
      </main>
    </ThemeProvider>
  );
}

// ISR configuration: revalidate every hour
export const revalidate = 3600;
