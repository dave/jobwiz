import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import {
  validateCompanyRoleRoute,
  getTopCompanyRoleCombos,
} from "@/lib/routing";
import { createServerClient } from "@/lib/supabase/server";
import {
  getPreviewContent,
  type PreviewContent,
  REVALIDATE_INTERVAL,
} from "@/lib/content-fetching";
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

export async function generateStaticParams(): Promise<
  { company: string; role: string }[]
> {
  const combos = getTopCompanyRoleCombos(100);
  return combos.map((combo) => ({
    company: combo.companySlug,
    role: combo.roleSlug,
  }));
}

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

  if (!result.isValid || !result.company || !result.role) {
    notFound();
  }

  if (result.needsRedirect && result.canonicalPath) {
    redirect(result.canonicalPath);
  }

  const { company, role, canonicalPath } = result;

  let previewContent: PreviewContent | null = null;
  let theme: ResolvedTheme;

  try {
    const supabase = await createServerClient();
    const [contentResult, themeResult] = await Promise.all([
      getPreviewContent(supabase, company.slug, role.slug).catch(() => null),
      getResolvedTheme(supabase, company.slug),
    ]);
    previewContent = contentResult;
    theme = themeResult;
  } catch {
    previewContent = null;
    theme = resolveTheme(company.slug, null);
  }

  const hasContent = previewContent && previewContent.modules.length > 0;

  const courseSchema = generateCourseSchema(company, role, canonicalPath ?? `/${company.slug}/${role.slug}`);
  const organizationSchema = generateOrganizationSchema();
  const faqSchema = generateDefaultFAQSchema(company, role);
  const breadcrumbSchema = generateCompanyRoleBreadcrumbs(company, role);

  // Topics we cover - will come from content later
  const topics = hasContent && previewContent
    ? previewContent.modules.map(m => m.title)
    : [
        "Interview fundamentals",
        `${company.name} culture and process`,
        `${role.name} frameworks`,
        "Common mistakes to avoid",
      ];

  return (
    <ThemeProvider theme={theme} as="div">
      <JsonLd data={courseSchema} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />

      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <CompanyLogo
                logoUrl={theme.logoUrl}
                companyName={company.name}
                size="large"
              />
            </div>

            <h1
              className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight mb-6"
              style={{ lineHeight: 1.15 }}
            >
              How{" "}
              <span className="text-[var(--theme-primary,#2563eb)]">
                {company.name}
              </span>{" "}
              {role.name} interviewers think
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed mb-10 mx-auto max-w-xl">
              Go beyond practice questions. Learn what actually makes candidates succeed.
            </p>

            <Link
              href={`/${company.slug}/${role.slug}/journey`}
              className="inline-flex items-center px-6 py-3.5 text-base font-medium rounded-full bg-[var(--theme-primary,#2563eb)] text-white hover:opacity-90 transition-opacity"
            >
              Start preparing
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Scroll indicator */}
            <div className="mt-16 flex justify-center">
              <svg
                className="w-6 h-6 text-gray-300 animate-bounce"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </section>

        {/* The insight */}
        <section className="px-6 py-20 bg-gray-50">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm font-medium text-[var(--theme-primary,#2563eb)] uppercase tracking-wide mb-4">
              Our approach
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-6">
              Interview prep shouldn&apos;t teach answers, it should reveal your thinking.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Most prep trains memorization, but {company.name} interviewers look for how you reason. We built our prep around the signals that turn a &quot;maybe&quot; into a strong yes.
            </p>
          </div>
        </section>

        {/* What's covered */}
        <section className="px-6 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              {/* Left: bullets */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-8">
                  What you&apos;ll learn
                </h2>
                <ul className="space-y-4">
                  {topics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--theme-primary-light,#dbeafe)] text-[var(--theme-primary,#2563eb)] text-sm font-medium flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-lg text-gray-700">{topic}</span>
                    </li>
                  ))}
                </ul>

                {hasContent && previewContent && previewContent.premiumModuleCount > 0 && (
                  <p className="mt-8 text-gray-500">
                    Plus {previewContent.premiumModuleCount} more in-depth modules with full access.
                  </p>
                )}
              </div>

              {/* Right: course preview mockup */}
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transform rotate-2">
                  {/* Mock window chrome */}
                  <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  </div>
                  {/* Mock content */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-[var(--theme-primary-light,#dbeafe)] flex items-center justify-center">
                        <CompanyLogo
                          logoUrl={theme.logoUrl}
                          companyName={company.name}
                          size="small"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{company.name} Interview Prep</div>
                        <div className="text-xs text-gray-500">{role.name}</div>
                      </div>
                    </div>
                    {/* Mock module cards */}
                    {topics.slice(0, 3).map((topic, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${i === 0 ? 'bg-[var(--theme-primary,#2563eb)] text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {i === 0 ? '▶' : (i + 1)}
                        </div>
                        <span className="text-sm text-gray-700 truncate">{topic}</span>
                      </div>
                    ))}
                    <div className="pt-2">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full w-1/4 bg-[var(--theme-primary,#2563eb)] rounded-full" />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">25% complete</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 py-20 bg-gray-50">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-8">
              Ready to ace that interview?
            </h2>
            <Link
              href={`/${company.slug}/${role.slug}/journey`}
              className="inline-flex items-center px-6 py-3.5 text-base font-medium rounded-full bg-[var(--theme-primary,#2563eb)] text-white hover:opacity-90 transition-opacity"
            >
              Start your prep
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

      </main>
    </ThemeProvider>
  );
}

export const revalidate = REVALIDATE_INTERVAL;
export const dynamicParams = true;
