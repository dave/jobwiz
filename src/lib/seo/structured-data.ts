/**
 * JSON-LD structured data generation
 */

import type { CompanyData, CompanyRole } from "@/lib/routing/types";
import type {
  CourseSchema,
  OrganizationSchema,
  FAQSchema,
  BreadcrumbSchema,
} from "./types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ace-that-interview.com";
const SITE_NAME = "Ace That Interview";
const LOGO_URL = `${SITE_URL}/logo.png`;

/**
 * Generate Course schema for a company/role landing page
 */
export function generateCourseSchema(
  company: CompanyData,
  role: CompanyRole,
  canonicalPath: string
): CourseSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${company.name} ${role.name} Interview Prep`,
    description: `Comprehensive interview preparation course for ${role.name} positions at ${company.name}. Learn the skills, practice questions, and strategies needed to succeed.`,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    courseCode: `${company.slug}-${role.slug}`.toUpperCase(),
    educationalLevel: "Professional",
    about: [
      `${company.name} interviews`,
      `${role.name} interviews`,
      "Interview preparation",
      "Career development",
    ],
    teaches: [
      `${company.name} company culture and values`,
      `${role.name} technical skills`,
      "Behavioral interview techniques",
      "Interview question strategies",
    ],
    url: `${SITE_URL}${canonicalPath}`,
  };
}

/**
 * Generate Organization schema for JobWiz
 */
export function generateOrganizationSchema(): OrganizationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      "Ace That Interview helps job seekers prepare for interviews at top companies with personalized prep courses, practice questions, and insider tips.",
    sameAs: [
      "https://twitter.com/acethatinterview",
      "https://linkedin.com/company/ace-that-interview",
    ],
  };
}

/**
 * Generate FAQ schema from Q&A content
 */
export function generateFAQSchema(
  questions: Array<{ question: string; answer: string }>
): FAQSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

/**
 * Generate default FAQ schema for a company/role page
 */
export function generateDefaultFAQSchema(
  company: CompanyData,
  role: CompanyRole
): FAQSchema {
  return generateFAQSchema([
    {
      question: `How do I prepare for a ${role.name} interview at ${company.name}?`,
      answer: `Our comprehensive ${company.name} ${role.name} interview prep course covers company culture, common interview questions, behavioral interviews, and role-specific technical skills. Start with understanding ${company.name}'s values and work through our practice questions.`,
    },
    {
      question: `What questions are asked in ${company.name} ${role.name} interviews?`,
      answer: `${company.name} ${role.name} interviews typically include behavioral questions about leadership and teamwork, technical questions specific to the ${role.name} role, and questions about company culture fit. Our course provides real questions from past interviews.`,
    },
    {
      question: `How long does it take to prepare for a ${company.name} interview?`,
      answer: `Most candidates benefit from 1-2 weeks of focused preparation. Our ${company.name} ${role.name} prep course is designed to be completed in about 10-15 hours, covering all essential topics for success.`,
    },
  ]);
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
): BreadcrumbSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: `${SITE_URL}${item.url}` } : {}),
    })),
  };
}

/**
 * Generate breadcrumbs for company/role page
 */
export function generateCompanyRoleBreadcrumbs(
  company: CompanyData,
  role: CompanyRole
): BreadcrumbSchema {
  return generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: company.name, url: `/${company.slug}` },
    { name: role.name },
  ]);
}

/**
 * Generate breadcrumbs for company page
 */
export function generateCompanyBreadcrumbs(
  company: CompanyData
): BreadcrumbSchema {
  return generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: company.name },
  ]);
}

/**
 * Serialize JSON-LD for embedding in HTML
 */
export function serializeJsonLd<T extends object>(data: T): string {
  return JSON.stringify(data);
}
