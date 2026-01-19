import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import {
  validateCompanyRoleRoute,
  getTopCompanyRoleCombos,
} from "@/lib/routing";
import { createServerClient } from "@/lib/supabase/server";
import { REVALIDATE_INTERVAL } from "@/lib/content-fetching";
import {
  generateCompanyRoleMetadata,
  generate404Metadata,
  generateCourseSchema,
  generateOrganizationSchema,
  generateDefaultFAQSchema,
  generateCompanyRoleBreadcrumbs,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo";
import { ThemeProvider, CompanyLogo } from "@/components/theme";
import { getResolvedTheme, type ResolvedTheme, resolveTheme } from "@/lib/theme";

interface CompanyRolePageProps {
  params: Promise<{
    company: string;
    role: string;
  }>;
}

/**
 * Generate static params for top company/role combinations
 */
export async function generateStaticParams(): Promise<
  { company: string; role: string }[]
> {
  const combos = getTopCompanyRoleCombos(100);
  return combos.map((combo) => ({
    company: combo.companySlug,
    role: combo.roleSlug,
  }));
}

/**
 * Generate metadata for company/role page
 */
export async function generateMetadata({
  params,
}: CompanyRolePageProps): Promise<Metadata> {
  const { company: companySlug, role: roleSlug } = await params;
  const result = validateCompanyRoleRoute(companySlug, roleSlug);

  if (!result.isValid || !result.company || !result.role) {
    return generate404Metadata();
  }

  const { company, role, canonicalPath } = result;
  return generateCompanyRoleMetadata(company, role, canonicalPath ?? `/${company.slug}/${role.slug}`);
}

export default async function CompanyRolePage({ params }: CompanyRolePageProps) {
  const { company: companySlug, role: roleSlug } = await params;
  const result = validateCompanyRoleRoute(companySlug, roleSlug);

  // Invalid company or role - 404
  if (!result.isValid || !result.company || !result.role) {
    notFound();
  }

  // Case mismatch - redirect to canonical URL
  if (result.needsRedirect && result.canonicalPath) {
    redirect(result.canonicalPath);
  }

  const { company, role, canonicalPath } = result;

  // Fetch theme from Supabase
  // Note: Module content is loaded from JSON files by the carousel loader (src/lib/carousel/load-modules.ts)
  let theme: ResolvedTheme;

  try {
    const supabase = await createServerClient();
    theme = await getResolvedTheme(supabase, company.slug);
  } catch {
    // Fallback to default theme if Supabase unavailable
    theme = resolveTheme(company.slug, null);
  }

  // Generate structured data
  const courseSchema = generateCourseSchema(company, role, canonicalPath ?? `/${company.slug}/${role.slug}`);
  const organizationSchema = generateOrganizationSchema();
  const faqSchema = generateDefaultFAQSchema(company, role);
  const breadcrumbSchema = generateCompanyRoleBreadcrumbs(company, role);

  return (
    <ThemeProvider theme={theme} as="div">
      {/* JSON-LD Structured Data */}
      <JsonLd data={courseSchema} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={faqSchema} />
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
                {company.name} {role.name} Interview Prep
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Get ready to ace your {company.name} {role.name} interview with
                our comprehensive preparation guide.
              </p>

              {/* Themed CTA button - links to journey */}
              <Link
                href={`/${company.slug}/${role.slug}/journey`}
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg min-h-[44px] min-w-[44px] bg-[var(--theme-primary,#2563eb)] text-[var(--theme-text-on-primary,#ffffff)] hover:bg-[var(--theme-primary-hover,#1d4ed8)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--theme-primary,#2563eb)]"
              >
                Start Your Prep
              </Link>
            </div>
          </div>
        </section>

        {/* Content Preview Section */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            What You&apos;ll Learn
          </h2>

          {/* Placeholder content - modules are loaded from JSON files in the journey */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 bg-white rounded-lg border border-gray-200 hover:border-[var(--theme-primary,#2563eb)] transition-colors">
              <div className="w-10 h-10 bg-[var(--theme-primary-light,#dbeafe)] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-[var(--theme-primary,#2563eb)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Company Culture</h3>
              <p className="text-sm text-gray-500">
                Learn what {company.name} looks for in candidates and how to
                demonstrate cultural fit.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg border border-gray-200 hover:border-[var(--theme-primary,#2563eb)] transition-colors">
              <div className="w-10 h-10 bg-[var(--theme-secondary-light,#f1f5f9)] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-[var(--theme-secondary,#64748b)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Practice Questions</h3>
              <p className="text-sm text-gray-500">
                Real interview questions from {role.name} interviews at{" "}
                {company.name}.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg border border-gray-200 hover:border-[var(--theme-primary,#2563eb)] transition-colors">
              <div className="w-10 h-10 bg-[var(--theme-primary-light,#dbeafe)] rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-5 h-5 text-[var(--theme-primary,#2563eb)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Insider Tips</h3>
              <p className="text-sm text-gray-500">
                Proven strategies and tips from successful {company.name}{" "}
                candidates.
              </p>
            </div>
          </div>
        </section>

        {/* Navigation */}
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
                <Link
                  href={`/${company.slug}`}
                  className="hover:text-[var(--theme-primary,#2563eb)] transition-colors"
                >
                  {company.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span className="text-gray-900" aria-current="page">{role.name}</span>
              </li>
            </ol>
          </nav>
        </section>
      </main>
    </ThemeProvider>
  );
}

// ISR configuration: revalidate every hour (use centralized constant)
export const revalidate = REVALIDATE_INTERVAL;

// Use blocking fallback for new pages not in static params
export const dynamicParams = true;
