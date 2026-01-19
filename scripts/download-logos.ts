/**
 * Script to download company logos locally
 * Run with: npx tsx scripts/download-logos.ts
 */

import fs from "fs";
import path from "path";
import { companyDomains } from "../src/lib/theme/company-domains";

const LOGOS_DIR = path.join(process.cwd(), "public", "logos");

// Google's high-quality favicon service (up to 256px)
function getGoogleFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

async function downloadLogo(
  slug: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  const outputPath = path.join(LOGOS_DIR, `${slug}.png`);

  // Skip if already exists
  if (fs.existsSync(outputPath)) {
    console.log(`  ⏭️  ${slug} - already exists`);
    return { success: true };
  }

  try {
    const url = getGoogleFaviconUrl(domain);
    const response = await fetch(url);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`  ✅ ${slug} - downloaded`);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function main() {
  console.log("🖼️  Downloading company logos...\n");

  // Ensure directory exists
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
  }

  const entries = Object.entries(companyDomains);
  let success = 0;
  let failed = 0;
  const failures: { slug: string; error: string }[] = [];

  for (const [slug, domain] of entries) {
    const result = await downloadLogo(slug, domain);
    if (result.success) {
      success++;
    } else {
      failed++;
      failures.push({ slug, error: result.error || "Unknown error" });
      console.log(`  ❌ ${slug} - ${result.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n📊 Results: ${success} succeeded, ${failed} failed`);

  if (failures.length > 0) {
    console.log("\n❌ Failed logos:");
    failures.forEach((f) => console.log(`   - ${f.slug}: ${f.error}`));
  }
}

main().catch(console.error);
