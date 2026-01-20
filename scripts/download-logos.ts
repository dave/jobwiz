#!/usr/bin/env npx ts-node
/**
 * Download SVG logos for all companies using Brandfetch API
 */

import * as fs from "fs";
import * as path from "path";

const API_KEY =
  "F8vYCqIEjpbs9faIEWu_UDOYeVqZZsfNV8GPA8uxbmh2jGa54m0nWUYj8C5PsmT61EFj8jPgWo5ukfRcL7tE5w";

// Map company names to their domains
const companyDomains: Record<string, string> = {
  Google: "google.com",
  Meta: "meta.com",
  Amazon: "amazon.com",
  Apple: "apple.com",
  Microsoft: "microsoft.com",
  Netflix: "netflix.com",
  Nvidia: "nvidia.com",
  Intel: "intel.com",
  AMD: "amd.com",
  Cisco: "cisco.com",
  Stripe: "stripe.com",
  Figma: "figma.com",
  Notion: "notion.so",
  Vercel: "vercel.com",
  Databricks: "databricks.com",
  Snowflake: "snowflake.com",
  Airbnb: "airbnb.com",
  Uber: "uber.com",
  Lyft: "lyft.com",
  DoorDash: "doordash.com",
  Instacart: "instacart.com",
  Coinbase: "coinbase.com",
  Robinhood: "robinhood.com",
  Plaid: "plaid.com",
  "Goldman Sachs": "goldmansachs.com",
  "JPMorgan Chase": "jpmorganchase.com",
  "Morgan Stanley": "morganstanley.com",
  "Bank of America": "bankofamerica.com",
  Citadel: "citadel.com",
  "Two Sigma": "twosigma.com",
  "Jane Street": "janestreet.com",
  BlackRock: "blackrock.com",
  Fidelity: "fidelity.com",
  "Charles Schwab": "schwab.com",
  Visa: "visa.com",
  Mastercard: "mastercard.com",
  PayPal: "paypal.com",
  Block: "block.xyz",
  "McKinsey & Company": "mckinsey.com",
  "Boston Consulting Group": "bcg.com",
  "Bain & Company": "bain.com",
  Deloitte: "deloitte.com",
  Accenture: "accenture.com",
  PwC: "pwc.com",
  EY: "ey.com",
  KPMG: "kpmg.com",
  Capgemini: "capgemini.com",
  "Booz Allen Hamilton": "boozallen.com",
  Shopify: "shopify.com",
  Etsy: "etsy.com",
  Wayfair: "wayfair.com",
  Chewy: "chewy.com",
  Target: "target.com",
  Walmart: "walmart.com",
  Costco: "costco.com",
  "Home Depot": "homedepot.com",
  "Best Buy": "bestbuy.com",
  Nike: "nike.com",
  Lululemon: "lululemon.com",
  "Epic Systems": "epic.com",
  Cerner: "cerner.com",
  Optum: "optum.com",
  "UnitedHealth Group": "unitedhealthgroup.com",
  "CVS Health": "cvshealth.com",
  "Johnson & Johnson": "jnj.com",
  Pfizer: "pfizer.com",
  Moderna: "modernatx.com",
  Illumina: "illumina.com",
  Genentech: "gene.com",
  Salesforce: "salesforce.com",
  Oracle: "oracle.com",
  SAP: "sap.com",
  Workday: "workday.com",
  ServiceNow: "servicenow.com",
  Atlassian: "atlassian.com",
  Splunk: "splunk.com",
  Twilio: "twilio.com",
  HubSpot: "hubspot.com",
  Zendesk: "zendesk.com",
  Okta: "okta.com",
  Cloudflare: "cloudflare.com",
  MongoDB: "mongodb.com",
  Elastic: "elastic.co",
  Disney: "disney.com",
  "Warner Bros Discovery": "wbd.com",
  Spotify: "spotify.com",
  TikTok: "tiktok.com",
  Snap: "snap.com",
  Pinterest: "pinterest.com",
  Reddit: "reddit.com",
  LinkedIn: "linkedin.com",
  X: "x.com",
  "Electronic Arts": "ea.com",
  "Activision Blizzard": "activisionblizzard.com",
  Tesla: "tesla.com",
  Adobe: "adobe.com",
  IBM: "ibm.com",
  VMware: "vmware.com",
  Palantir: "palantir.com",
  Dropbox: "dropbox.com",
  Asana: "asana.com",
  Slack: "slack.com",
  DocuSign: "docusign.com",
  Roblox: "roblox.com",
};

// Map company names to their slugs (for filename)
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface BrandfetchLogo {
  theme: string;
  formats: Array<{
    src: string;
    format: string;
    background: string | null;
  }>;
  type: string;
}

interface BrandfetchResponse {
  name: string;
  logos: BrandfetchLogo[];
}

async function fetchBrandData(domain: string): Promise<BrandfetchResponse | null> {
  try {
    const response = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`  Failed to fetch ${domain}: ${response.status}`);
      return null;
    }

    return (await response.json()) as BrandfetchResponse;
  } catch (error) {
    console.error(`  Error fetching ${domain}:`, error);
    return null;
  }
}

function findSvgLogo(logos: BrandfetchLogo[]): string | null {
  // Priority: logo > symbol > icon, prefer light theme
  const priorities = ["logo", "symbol", "icon"];
  const themes = ["light", "dark"];

  for (const type of priorities) {
    for (const theme of themes) {
      const logo = logos.find((l) => l.type === type && l.theme === theme);
      if (logo) {
        const svgFormat = logo.formats.find((f) => f.format === "svg");
        if (svgFormat) {
          return svgFormat.src;
        }
      }
    }
  }

  // Fallback: any SVG
  for (const logo of logos) {
    const svgFormat = logo.formats.find((f) => f.format === "svg");
    if (svgFormat) {
      return svgFormat.src;
    }
  }

  return null;
}

async function downloadSvg(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  Failed to download SVG: ${response.status}`);
      return false;
    }

    const svg = await response.text();
    fs.writeFileSync(outputPath, svg);
    return true;
  } catch (error) {
    console.error(`  Error downloading SVG:`, error);
    return false;
  }
}

async function main() {
  const outputDir = path.join(process.cwd(), "public/logos");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const companies = Object.keys(companyDomains);
  let success = 0;
  let failed = 0;

  console.log(`Downloading SVG logos for ${companies.length} companies...\n`);

  for (const company of companies) {
    const domain = companyDomains[company];
    if (!domain) {
      console.log(`${company}: No domain mapping`);
      failed++;
      continue;
    }
    const slug = slugify(company);
    const outputPath = path.join(outputDir, `${slug}.svg`);

    process.stdout.write(`${company} (${domain})... `);

    const brandData = await fetchBrandData(domain);
    if (!brandData) {
      failed++;
      continue;
    }

    const svgUrl = findSvgLogo(brandData.logos);
    if (!svgUrl) {
      console.log("No SVG found");
      failed++;
      continue;
    }

    const downloaded = await downloadSvg(svgUrl, outputPath);
    if (downloaded) {
      console.log(`✓ saved to ${slug}.svg`);
      success++;
    } else {
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
