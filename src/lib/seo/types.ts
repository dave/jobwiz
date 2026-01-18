/**
 * SEO types for meta tags and structured data
 */

export interface SEOConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  noIndex?: boolean;
}

export interface OpenGraphData {
  title: string;
  description: string;
  url: string;
  siteName: string;
  type: "website" | "article";
  image?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
}

export interface TwitterCardData {
  card: "summary" | "summary_large_image";
  site?: string;
  title: string;
  description: string;
  image?: string;
}

/**
 * JSON-LD Course schema
 * @see https://schema.org/Course
 */
export interface CourseSchema {
  "@context": "https://schema.org";
  "@type": "Course";
  name: string;
  description: string;
  provider: {
    "@type": "Organization";
    name: string;
    url: string;
  };
  courseCode?: string;
  educationalLevel?: string;
  about?: string[];
  teaches?: string[];
  url: string;
}

/**
 * JSON-LD Organization schema
 * @see https://schema.org/Organization
 */
export interface OrganizationSchema {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

/**
 * JSON-LD FAQ schema
 * @see https://schema.org/FAQPage
 */
export interface FAQSchema {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

/**
 * JSON-LD BreadcrumbList schema
 * @see https://schema.org/BreadcrumbList
 */
export interface BreadcrumbSchema {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }>;
}

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
}
