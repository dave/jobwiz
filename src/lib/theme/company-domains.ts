/**
 * Company slug to domain mapping for Clearbit Logo API
 */
export const companyDomains: Record<string, string> = {
  // Big Tech
  google: "google.com",
  meta: "meta.com",
  amazon: "amazon.com",
  apple: "apple.com",
  microsoft: "microsoft.com",
  netflix: "netflix.com",
  nvidia: "nvidia.com",
  intel: "intel.com",
  amd: "amd.com",
  cisco: "cisco.com",

  // Tech Startups / Growth
  stripe: "stripe.com",
  figma: "figma.com",
  notion: "notion.so",
  vercel: "vercel.com",
  databricks: "databricks.com",
  snowflake: "snowflake.com",
  airbnb: "airbnb.com",
  uber: "uber.com",
  lyft: "lyft.com",
  doordash: "doordash.com",
  instacart: "instacart.com",
  coinbase: "coinbase.com",
  robinhood: "robinhood.com",
  plaid: "plaid.com",

  // Finance
  "goldman-sachs": "goldmansachs.com",
  jpmorgan: "jpmorgan.com",
  "morgan-stanley": "morganstanley.com",
  "bank-of-america": "bankofamerica.com",
  citadel: "citadel.com",
  "two-sigma": "twosigma.com",
  "jane-street": "janestreet.com",
  blackrock: "blackrock.com",
  fidelity: "fidelity.com",
  "charles-schwab": "schwab.com",
  visa: "visa.com",
  mastercard: "mastercard.com",
  paypal: "paypal.com",
  block: "block.xyz",

  // Consulting
  mckinsey: "mckinsey.com",
  bcg: "bcg.com",
  bain: "bain.com",
  deloitte: "deloitte.com",
  accenture: "accenture.com",
  pwc: "pwc.com",
  ey: "ey.com",
  kpmg: "kpmg.com",
  capgemini: "capgemini.com",
  "booz-allen": "boozallen.com",

  // Retail / E-commerce
  shopify: "shopify.com",
  etsy: "etsy.com",
  wayfair: "wayfair.com",
  chewy: "chewy.com",
  target: "target.com",
  walmart: "walmart.com",
  costco: "costco.com",
  "home-depot": "homedepot.com",
  "best-buy": "bestbuy.com",
  nike: "nike.com",
  lululemon: "lululemon.com",

  // Healthcare / Biotech
  epic: "epic.com",
  cerner: "cerner.com",
  optum: "optum.com",
  unitedhealth: "unitedhealthgroup.com",
  "cvs-health": "cvshealth.com",
  jnj: "jnj.com",
  pfizer: "pfizer.com",
  moderna: "modernatx.com",
  illumina: "illumina.com",
  genentech: "gene.com",

  // Enterprise SaaS
  salesforce: "salesforce.com",
  oracle: "oracle.com",
  sap: "sap.com",
  workday: "workday.com",
  servicenow: "servicenow.com",
  atlassian: "atlassian.com",
  splunk: "splunk.com",
  twilio: "twilio.com",
  hubspot: "hubspot.com",
  zendesk: "zendesk.com",
  okta: "okta.com",
  cloudflare: "cloudflare.com",
  mongodb: "mongodb.com",
  elastic: "elastic.co",

  // Media / Entertainment
  disney: "disney.com",
  wbd: "wbd.com",
  spotify: "spotify.com",
  tiktok: "tiktok.com",
  snap: "snap.com",
  pinterest: "pinterest.com",
  reddit: "reddit.com",
  linkedin: "linkedin.com",
  x: "x.com",
  ea: "ea.com",
  "activision-blizzard": "activisionblizzard.com",

  // Other Tech
  tesla: "tesla.com",
  adobe: "adobe.com",
  ibm: "ibm.com",
  vmware: "vmware.com",
  palantir: "palantir.com",
  dropbox: "dropbox.com",
  slack: "slack.com",
  zoom: "zoom.us",
  docusign: "docusign.com",
  asana: "asana.com",
  roblox: "roblox.com",
};

/**
 * Get Clearbit logo URL for a company
 */
export function getClearbitLogoUrl(companySlug: string): string | null {
  const domain = companyDomains[companySlug];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}
