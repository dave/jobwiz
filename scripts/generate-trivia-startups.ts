#!/usr/bin/env npx tsx

/**
 * Generate company trivia for High-growth startups batch
 * Issue #87
 */

import * as fs from 'fs';
import * as path from 'path';

// Trivia item interface matching the Python generator
interface TriviaItem {
  company_slug: string;
  fact_type: 'founding' | 'hq' | 'mission' | 'product' | 'news' | 'exec' | 'acquisition';
  format: 'quiz' | 'flashcard' | 'factoid';
  question: string | null;
  answer: string;
  options: string[] | null;
  source_url: string | null;
  source_date: string | null;
}

// High-growth startups company data
const startupCompanies: Record<string, {
  name: string;
  foundingYear: string;
  founders: string[];
  hq: string;
  ceo: string;
  mission: string;
  products: string[];
  acquisitions: { name: string; year: string }[];
  wikipedia: string;
}> = {
  stripe: {
    name: 'Stripe',
    foundingYear: '2010',
    founders: ['Patrick Collison', 'John Collison'],
    hq: 'San Francisco, California',
    ceo: 'Patrick Collison',
    mission: 'To increase the GDP of the internet',
    products: ['Stripe Payments', 'Stripe Connect', 'Stripe Atlas', 'Stripe Radar', 'Stripe Terminal', 'Stripe Billing'],
    acquisitions: [
      { name: 'Paystack', year: '2020' },
      { name: 'TaxJar', year: '2021' },
      { name: 'Bouncer', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Stripe_(company)'
  },
  figma: {
    name: 'Figma',
    foundingYear: '2012',
    founders: ['Dylan Field', 'Evan Wallace'],
    hq: 'San Francisco, California',
    ceo: 'Dylan Field',
    mission: 'To make design accessible to everyone',
    products: ['Figma Design', 'FigJam', 'Figma Dev Mode', 'Figma Slides'],
    acquisitions: [
      { name: 'Diagram', year: '2023' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Figma'
  },
  notion: {
    name: 'Notion',
    foundingYear: '2013',
    founders: ['Ivan Zhao', 'Simon Last'],
    hq: 'San Francisco, California',
    ceo: 'Ivan Zhao',
    mission: 'To make it possible for everyone to tailor the software they use every day to their exact needs',
    products: ['Notion Workspace', 'Notion AI', 'Notion Calendar', 'Notion Projects'],
    acquisitions: [
      { name: 'Automate.io', year: '2021' },
      { name: 'Cron', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Notion_(productivity_software)'
  },
  vercel: {
    name: 'Vercel',
    foundingYear: '2015',
    founders: ['Guillermo Rauch'],
    hq: 'San Francisco, California',
    ceo: 'Guillermo Rauch',
    mission: 'To enable developers to build and deploy web applications with speed and ease',
    products: ['Vercel Platform', 'Next.js', 'Vercel AI SDK', 'v0', 'Turbo'],
    acquisitions: [
      { name: 'Turborepo', year: '2021' },
      { name: 'Splitbee', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Vercel'
  },
  databricks: {
    name: 'Databricks',
    foundingYear: '2013',
    founders: ['Ali Ghodsi', 'Matei Zaharia', 'Reynold Xin', 'Patrick Wendell', 'Andy Konwinski', 'Ion Stoica', 'Arsalan Tavakoli-Shiraji'],
    hq: 'San Francisco, California',
    ceo: 'Ali Ghodsi',
    mission: 'To help data teams solve the world\'s toughest problems',
    products: ['Databricks Lakehouse Platform', 'Delta Lake', 'MLflow', 'Apache Spark', 'Unity Catalog'],
    acquisitions: [
      { name: 'MosaicML', year: '2023' },
      { name: 'Einblick', year: '2023' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Databricks'
  },
  snowflake: {
    name: 'Snowflake',
    foundingYear: '2012',
    founders: ['Benoit Dageville', 'Thierry Cruanes', 'Marcin Zukowski'],
    hq: 'Bozeman, Montana',
    ceo: 'Sridhar Ramaswamy',
    mission: 'To mobilize the world\'s data by enabling customers to consolidate data into a single source of truth',
    products: ['Snowflake Data Cloud', 'Snowpark', 'Streamlit', 'Snowflake Cortex'],
    acquisitions: [
      { name: 'Streamlit', year: '2022' },
      { name: 'Neeva', year: '2023' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Snowflake_Inc.'
  },
  airbnb: {
    name: 'Airbnb',
    foundingYear: '2008',
    founders: ['Brian Chesky', 'Joe Gebbia', 'Nathan Blecharczyk'],
    hq: 'San Francisco, California',
    ceo: 'Brian Chesky',
    mission: 'To create a world where anyone can belong anywhere',
    products: ['Airbnb Stays', 'Airbnb Experiences', 'Airbnb Luxe', 'Airbnb Plus'],
    acquisitions: [
      { name: 'HotelTonight', year: '2019' },
      { name: 'Urbandoor', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Airbnb'
  },
  uber: {
    name: 'Uber',
    foundingYear: '2009',
    founders: ['Travis Kalanick', 'Garrett Camp'],
    hq: 'San Francisco, California',
    ceo: 'Dara Khosrowshahi',
    mission: 'To ignite opportunity by setting the world in motion',
    products: ['Uber Rides', 'Uber Eats', 'Uber Freight', 'Uber for Business'],
    acquisitions: [
      { name: 'Postmates', year: '2020' },
      { name: 'Drizly', year: '2021' },
      { name: 'Careem', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Uber'
  },
  lyft: {
    name: 'Lyft',
    foundingYear: '2012',
    founders: ['Logan Green', 'John Zimmer'],
    hq: 'San Francisco, California',
    ceo: 'David Risher',
    mission: 'To improve people\'s lives with the world\'s best transportation',
    products: ['Lyft Rides', 'Lyft Pink', 'Lyft Business', 'Lyft Bikes and Scooters'],
    acquisitions: [
      { name: 'Motivate', year: '2018' },
      { name: 'PBSC Urban Solutions', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Lyft'
  },
  doordash: {
    name: 'DoorDash',
    foundingYear: '2013',
    founders: ['Tony Xu', 'Andy Fang', 'Stanley Tang', 'Evan Moore'],
    hq: 'San Francisco, California',
    ceo: 'Tony Xu',
    mission: 'To empower local economies around the world',
    products: ['DoorDash', 'DashPass', 'DoorDash Drive', 'DoorDash for Work'],
    acquisitions: [
      { name: 'Wolt', year: '2022' },
      { name: 'Caviar', year: '2019' },
      { name: 'Bbot', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/DoorDash'
  },
  instacart: {
    name: 'Instacart',
    foundingYear: '2012',
    founders: ['Apoorva Mehta', 'Max Mullen', 'Brandon Leonardo'],
    hq: 'San Francisco, California',
    ceo: 'Fidji Simo',
    mission: 'To create a world where everyone has access to the food they love and more time to enjoy it together',
    products: ['Instacart Delivery', 'Instacart+ membership', 'Instacart Platform', 'Caper Carts'],
    acquisitions: [
      { name: 'Caper AI', year: '2021' },
      { name: 'FoodStorm', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Instacart'
  },
  coinbase: {
    name: 'Coinbase',
    foundingYear: '2012',
    founders: ['Brian Armstrong', 'Fred Ehrsam'],
    hq: 'San Francisco, California',
    ceo: 'Brian Armstrong',
    mission: 'To increase economic freedom in the world',
    products: ['Coinbase Exchange', 'Coinbase Wallet', 'Coinbase Prime', 'Base blockchain', 'Coinbase Commerce'],
    acquisitions: [
      { name: 'Neutrino', year: '2019' },
      { name: 'Bison Trails', year: '2021' },
      { name: 'Tagomi', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Coinbase'
  },
  robinhood: {
    name: 'Robinhood',
    foundingYear: '2013',
    founders: ['Vlad Tenev', 'Baiju Bhatt'],
    hq: 'Menlo Park, California',
    ceo: 'Vlad Tenev',
    mission: 'To democratize finance for all',
    products: ['Robinhood App', 'Robinhood Gold', 'Robinhood Cash Card', 'Robinhood Crypto'],
    acquisitions: [
      { name: 'MarketSnacks', year: '2019' },
      { name: 'Say Technologies', year: '2021' },
      { name: 'Cove Markets', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Robinhood_(company)'
  },
  plaid: {
    name: 'Plaid',
    foundingYear: '2013',
    founders: ['Zach Perret', 'William Hockey'],
    hq: 'San Francisco, California',
    ceo: 'Zach Perret',
    mission: 'To unlock financial freedom for everyone',
    products: ['Plaid Link', 'Plaid Auth', 'Plaid Identity', 'Plaid Balance', 'Plaid Transactions'],
    acquisitions: [
      { name: 'Quovo', year: '2019' },
      { name: 'Cognito', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Plaid_(company)'
  }
};

function generateFoundingTrivia(slug: string, company: typeof startupCompanies[string]): TriviaItem[] {
  const items: TriviaItem[] = [];
  const sourceDate = new Date().toISOString().split('T')[0] ?? null;

  // Quiz: Founding year
  items.push({
    company_slug: slug,
    fact_type: 'founding',
    format: 'quiz',
    question: `When was ${company.name} founded?`,
    answer: company.foundingYear,
    options: generateYearOptions(company.foundingYear),
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Flashcard: Founders
  const foundersList = company.founders.length > 2
    ? company.founders.slice(0, 2).join(' and ') + ' and others'
    : company.founders.join(' and ');
  items.push({
    company_slug: slug,
    fact_type: 'founding',
    format: 'flashcard',
    question: `Who founded ${company.name}?`,
    answer: foundersList,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Factoid
  items.push({
    company_slug: slug,
    fact_type: 'founding',
    format: 'factoid',
    question: null,
    answer: `${company.name} was founded in ${company.foundingYear} by ${foundersList}.`,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  return items;
}

function generateHqTrivia(slug: string, company: typeof startupCompanies[string]): TriviaItem[] {
  const items: TriviaItem[] = [];
  const sourceDate = new Date().toISOString().split('T')[0] ?? null;

  // Quiz: Headquarters
  items.push({
    company_slug: slug,
    fact_type: 'hq',
    format: 'quiz',
    question: `Where is ${company.name}'s headquarters located?`,
    answer: company.hq,
    options: generateHqOptions(company.hq),
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Flashcard
  items.push({
    company_slug: slug,
    fact_type: 'hq',
    format: 'flashcard',
    question: `What city is ${company.name} headquartered in?`,
    answer: company.hq,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  return items;
}

function generateExecTrivia(slug: string, company: typeof startupCompanies[string]): TriviaItem[] {
  const items: TriviaItem[] = [];
  const sourceDate = new Date().toISOString().split('T')[0] ?? null;

  // Quiz: CEO
  items.push({
    company_slug: slug,
    fact_type: 'exec',
    format: 'quiz',
    question: `Who is the current CEO of ${company.name}?`,
    answer: company.ceo,
    options: generateCeoOptions(company.ceo, slug),
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Flashcard
  items.push({
    company_slug: slug,
    fact_type: 'exec',
    format: 'flashcard',
    question: `Who leads ${company.name} as CEO?`,
    answer: company.ceo,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  return items;
}

function generateMissionTrivia(slug: string, company: typeof startupCompanies[string]): TriviaItem[] {
  const items: TriviaItem[] = [];
  const sourceDate = new Date().toISOString().split('T')[0] ?? null;

  // Factoid: Mission
  items.push({
    company_slug: slug,
    fact_type: 'mission',
    format: 'factoid',
    question: null,
    answer: `${company.name}'s mission is "${company.mission}".`,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Flashcard
  items.push({
    company_slug: slug,
    fact_type: 'mission',
    format: 'flashcard',
    question: `What is ${company.name}'s mission statement?`,
    answer: company.mission,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  return items;
}

function generateProductTrivia(slug: string, company: typeof startupCompanies[string]): TriviaItem[] {
  const items: TriviaItem[] = [];
  const sourceDate = new Date().toISOString().split('T')[0] ?? null;

  // Quiz: Products
  const mainProduct = company.products[0];
  items.push({
    company_slug: slug,
    fact_type: 'product',
    format: 'quiz',
    question: `Which of these is a ${company.name} product?`,
    answer: mainProduct!,
    options: generateProductOptions(mainProduct!, slug),
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Factoid: Products list
  const productsList = company.products.slice(0, 5).join(', ');
  items.push({
    company_slug: slug,
    fact_type: 'product',
    format: 'factoid',
    question: null,
    answer: `Key ${company.name} products include ${productsList}.`,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  return items;
}

function generateAcquisitionTrivia(slug: string, company: typeof startupCompanies[string]): TriviaItem[] {
  const items: TriviaItem[] = [];
  const sourceDate = new Date().toISOString().split('T')[0] ?? null;

  if (company.acquisitions.length === 0) return items;

  // Quiz: Notable acquisition
  const mainAcquisition = company.acquisitions[0];
  items.push({
    company_slug: slug,
    fact_type: 'acquisition',
    format: 'quiz',
    question: `Which company did ${company.name} acquire in ${mainAcquisition!.year}?`,
    answer: mainAcquisition!.name,
    options: generateAcquisitionOptions(mainAcquisition!.name),
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Factoid
  items.push({
    company_slug: slug,
    fact_type: 'acquisition',
    format: 'factoid',
    question: null,
    answer: `${company.name} acquired ${mainAcquisition!.name} in ${mainAcquisition!.year}.`,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Additional acquisition if available
  if (company.acquisitions.length > 1) {
    const secondAcquisition = company.acquisitions[1];
    items.push({
      company_slug: slug,
      fact_type: 'acquisition',
      format: 'flashcard',
      question: `In what year did ${company.name} acquire ${secondAcquisition!.name}?`,
      answer: secondAcquisition!.year,
      options: null,
      source_url: company.wikipedia,
      source_date: sourceDate
    });
  }

  return items;
}

function generateYearOptions(correctYear: string): string[] {
  const year = parseInt(correctYear);
  const options: string[] = [];
  const offsets = [-3, -1, 2];
  for (const offset of offsets) {
    options.push((year + offset).toString());
  }
  return options;
}

function generateHqOptions(correctHq: string): string[] {
  const hqOptions = [
    'San Francisco, California',
    'Seattle, Washington',
    'New York, New York',
    'Austin, Texas',
    'Boston, Massachusetts',
    'Chicago, Illinois',
    'Los Angeles, California',
    'Palo Alto, California',
    'Denver, Colorado',
    'Atlanta, Georgia',
    'Menlo Park, California',
    'Bozeman, Montana',
    'Mountain View, California'
  ];
  return hqOptions.filter(hq => hq !== correctHq).slice(0, 3);
}

function generateCeoOptions(correctCeo: string, companySlug: string): string[] {
  const ceoOptions: Record<string, string[]> = {
    stripe: ['Dylan Field', 'Brian Chesky', 'Dara Khosrowshahi'],
    figma: ['Patrick Collison', 'Ivan Zhao', 'Brian Armstrong'],
    notion: ['Dylan Field', 'Patrick Collison', 'Vlad Tenev'],
    vercel: ['Ivan Zhao', 'Dylan Field', 'Patrick Collison'],
    databricks: ['Patrick Collison', 'Brian Armstrong', 'Ivan Zhao'],
    snowflake: ['Ali Ghodsi', 'Brian Chesky', 'Patrick Collison'],
    airbnb: ['Dara Khosrowshahi', 'Tony Xu', 'Patrick Collison'],
    uber: ['Brian Chesky', 'Tony Xu', 'Logan Green'],
    lyft: ['Dara Khosrowshahi', 'Tony Xu', 'Brian Chesky'],
    doordash: ['Dara Khosrowshahi', 'Brian Chesky', 'Logan Green'],
    instacart: ['Tony Xu', 'Apoorva Mehta', 'Dara Khosrowshahi'],
    coinbase: ['Vlad Tenev', 'Patrick Collison', 'Zach Perret'],
    robinhood: ['Brian Armstrong', 'Patrick Collison', 'Zach Perret'],
    plaid: ['Vlad Tenev', 'Brian Armstrong', 'Patrick Collison']
  };
  return ceoOptions[companySlug] || ['Patrick Collison', 'Brian Chesky', 'Dara Khosrowshahi'];
}

function generateProductOptions(correctProduct: string, companySlug: string): string[] {
  const allProducts = [
    'Slack', 'Zoom', 'Dropbox', 'Asana', 'Monday.com',
    'Airtable', 'Linear', 'Loom', 'Miro', 'Calendly',
    'Canva', 'Grammarly', 'Webflow', 'Retool', 'Supabase',
    'PlanetScale', 'Neon', 'Railway', 'Render'
  ];
  return allProducts.filter(p => p !== correctProduct).slice(0, 3);
}

function generateAcquisitionOptions(correctAcquisition: string): string[] {
  const acquisitionOptions = [
    'Slack', 'Tableau', 'Figma', 'Notion',
    'Linear', 'Airtable', 'Miro', 'Loom',
    'Calendly', 'Webflow', 'Retool', 'Supabase',
    'PlanetScale', 'Neon', 'Railway', 'Render'
  ];
  return acquisitionOptions.filter(a => a !== correctAcquisition).slice(0, 3);
}

function generateCompanyTrivia(slug: string): TriviaItem[] {
  const company = startupCompanies[slug];
  if (!company) {
    console.warn(`No data for company: ${slug}`);
    return [];
  }

  const items: TriviaItem[] = [
    ...generateFoundingTrivia(slug, company),
    ...generateHqTrivia(slug, company),
    ...generateExecTrivia(slug, company),
    ...generateMissionTrivia(slug, company),
    ...generateProductTrivia(slug, company),
    ...generateAcquisitionTrivia(slug, company)
  ];

  return items;
}

function main() {
  const outputDir = path.join(process.cwd(), 'data', 'generated', 'trivia');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const slugs = Object.keys(startupCompanies);
  let totalItems = 0;

  for (const slug of slugs) {
    const items = generateCompanyTrivia(slug);
    const outputPath = path.join(outputDir, `${slug}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Generated ${items.length} trivia items for ${slug}`);
    totalItems += items.length;
  }

  console.log(`\nTotal: ${totalItems} trivia items for ${slugs.length} high-growth startup companies`);
}

main();
