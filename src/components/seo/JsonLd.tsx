/**
 * JSON-LD structured data component for embedding in pages
 */

import { serializeJsonLd } from "@/lib/seo";

interface JsonLdProps<T extends object> {
  data: T;
}

export function JsonLd<T extends object>({ data }: JsonLdProps<T>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export default JsonLd;
