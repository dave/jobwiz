#!/usr/bin/env npx tsx

/**
 * Generate company trivia for E-commerce/Retail batch
 * Issue #90
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

// E-commerce/Retail company data
const ecommerceCompanies: Record<string, {
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
  shopify: {
    name: 'Shopify',
    foundingYear: '2006',
    founders: ['Tobias Lütke', 'Daniel Weinand', 'Scott Lake'],
    hq: 'Ottawa, Ontario, Canada',
    ceo: 'Tobias Lütke',
    mission: 'To make commerce better for everyone',
    products: ['E-commerce Platform', 'Shopify POS', 'Shopify Payments', 'Shop Pay', 'Shopify Fulfillment Network'],
    acquisitions: [
      { name: 'Deliverr', year: '2022' },
      { name: '6 River Systems', year: '2019' },
      { name: 'Oberlo', year: '2017' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Shopify'
  },
  etsy: {
    name: 'Etsy',
    foundingYear: '2005',
    founders: ['Rob Kalin', 'Chris Maguire', 'Haim Schoppik'],
    hq: 'Brooklyn, New York',
    ceo: 'Josh Silverman',
    mission: 'To keep commerce human',
    products: ['Etsy Marketplace', 'Etsy Payments', 'Etsy Ads', 'Pattern', 'Etsy Seller App'],
    acquisitions: [
      { name: 'Depop', year: '2021' },
      { name: 'Elo7', year: '2021' },
      { name: 'Reverb', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Etsy'
  },
  wayfair: {
    name: 'Wayfair',
    foundingYear: '2002',
    founders: ['Niraj Shah', 'Steve Conine'],
    hq: 'Boston, Massachusetts',
    ceo: 'Niraj Shah',
    mission: 'To help everyone, anywhere, create their feeling of home',
    products: ['Wayfair', 'AllModern', 'Birch Lane', 'Joss & Main', 'Perigold'],
    acquisitions: [
      { name: 'Linen Alley', year: '2012' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Wayfair'
  },
  chewy: {
    name: 'Chewy',
    foundingYear: '2011',
    founders: ['Ryan Cohen', 'Michael Day'],
    hq: 'Dania Beach, Florida',
    ceo: 'Sumit Singh',
    mission: 'To be the most trusted and convenient destination for pet parents',
    products: ['Pet Food', 'Pet Supplies', 'Chewy Pharmacy', 'Autoship Subscriptions', 'Connect with a Vet'],
    acquisitions: [],
    wikipedia: 'https://en.wikipedia.org/wiki/Chewy_(company)'
  },
  target: {
    name: 'Target',
    foundingYear: '1902',
    founders: ['George Dayton'],
    hq: 'Minneapolis, Minnesota',
    ceo: 'Brian Cornell',
    mission: 'To help all families discover the joy of everyday life',
    products: ['General Merchandise', 'Target Circle', 'Shipt Same-Day Delivery', 'Target RedCard', 'Drive Up'],
    acquisitions: [
      { name: 'Shipt', year: '2017' },
      { name: 'Grand Junction', year: '2017' },
      { name: 'Deliv', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Target_Corporation'
  },
  walmart: {
    name: 'Walmart',
    foundingYear: '1962',
    founders: ['Sam Walton'],
    hq: 'Bentonville, Arkansas',
    ceo: 'Doug McMillon',
    mission: 'To save people money so they can live better',
    products: ['Walmart Stores', 'Walmart.com', "Sam's Club", 'Walmart+', 'Walmart Health'],
    acquisitions: [
      { name: 'Flipkart', year: '2018' },
      { name: 'Jet.com', year: '2016' },
      { name: 'Bonobos', year: '2017' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Walmart'
  },
  costco: {
    name: 'Costco',
    foundingYear: '1983',
    founders: ['James Sinegal', 'Jeffrey Brotman'],
    hq: 'Issaquah, Washington',
    ceo: 'Ron Vachris',
    mission: 'To continually provide our members with quality goods and services at the lowest possible prices',
    products: ['Warehouse Clubs', 'Kirkland Signature', 'Costco Travel', 'Costco Wholesale', 'Costco Pharmacy'],
    acquisitions: [
      { name: 'Price Club', year: '1993' },
      { name: 'Innovel Solutions', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Costco'
  },
  'home-depot': {
    name: 'The Home Depot',
    foundingYear: '1978',
    founders: ['Bernie Marcus', 'Arthur Blank', 'Ron Brill', 'Pat Farrah'],
    hq: 'Atlanta, Georgia',
    ceo: 'Ted Decker',
    mission: 'To provide the highest level of service, the broadest selection of products, and the most competitive prices',
    products: ['Home Improvement', 'Pro Services', 'Tool Rental', 'Installation Services', 'Home Depot Rental'],
    acquisitions: [
      { name: 'HD Supply', year: '2020' },
      { name: 'Interline Brands', year: '2015' },
      { name: 'Blinds.com', year: '2014' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/The_Home_Depot'
  },
  'best-buy': {
    name: 'Best Buy',
    foundingYear: '1966',
    founders: ['Richard Schulze'],
    hq: 'Richfield, Minnesota',
    ceo: 'Corie Barry',
    mission: 'To enrich lives through technology',
    products: ['Consumer Electronics', 'Geek Squad', 'Best Buy Business', 'Best Buy Health', 'Totaltech Membership'],
    acquisitions: [
      { name: 'GreatCall', year: '2018' },
      { name: 'Critical Signal Technologies', year: '2019' },
      { name: 'Current Health', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Best_Buy'
  },
  nike: {
    name: 'Nike',
    foundingYear: '1964',
    founders: ['Bill Bowerman', 'Phil Knight'],
    hq: 'Beaverton, Oregon',
    ceo: 'Elliott Hill',
    mission: 'To bring inspiration and innovation to every athlete in the world',
    products: ['Athletic Footwear', 'Athletic Apparel', 'Nike+', 'Air Jordan', 'Converse'],
    acquisitions: [
      { name: 'Converse', year: '2003' },
      { name: 'Zodiac', year: '2018' },
      { name: 'Datalogue', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Nike,_Inc.'
  },
  lululemon: {
    name: 'Lululemon',
    foundingYear: '1998',
    founders: ['Chip Wilson'],
    hq: 'Vancouver, British Columbia, Canada',
    ceo: 'Calvin McDonald',
    mission: 'To elevate human potential by helping people feel their best',
    products: ['Athletic Apparel', 'Yoga Wear', 'Running Gear', 'Accessories', 'Mirror Home Gym'],
    acquisitions: [
      { name: 'Mirror', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Lululemon_Athletica'
  }
};

function generateFoundingTrivia(slug: string, company: typeof ecommerceCompanies[string]): TriviaItem[] {
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

function generateHqTrivia(slug: string, company: typeof ecommerceCompanies[string]): TriviaItem[] {
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

function generateExecTrivia(slug: string, company: typeof ecommerceCompanies[string]): TriviaItem[] {
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

function generateMissionTrivia(slug: string, company: typeof ecommerceCompanies[string]): TriviaItem[] {
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

function generateProductTrivia(slug: string, company: typeof ecommerceCompanies[string]): TriviaItem[] {
  const items: TriviaItem[] = [];
  const sourceDate = new Date().toISOString().split('T')[0] ?? null;

  // Quiz: Products
  const mainProduct = company.products[0];
  items.push({
    company_slug: slug,
    fact_type: 'product',
    format: 'quiz',
    question: `Which of these is a ${company.name} product or service?`,
    answer: mainProduct!,
    options: generateProductOptions(mainProduct!, slug),
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  // Factoid: Products list
  const productsList = company.products.slice(0, 4).join(', ');
  items.push({
    company_slug: slug,
    fact_type: 'product',
    format: 'factoid',
    question: null,
    answer: `${company.name} offers ${productsList}.`,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  return items;
}

function generateAcquisitionTrivia(slug: string, company: typeof ecommerceCompanies[string]): TriviaItem[] {
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
  // For older companies (before 1950), use larger offsets
  if (year < 1950) {
    const offsets = [-15, -8, 10];
    for (const offset of offsets) {
      options.push((year + offset).toString());
    }
  } else if (year < 1980) {
    const offsets = [-8, -4, 6];
    for (const offset of offsets) {
      options.push((year + offset).toString());
    }
  } else {
    const offsets = [-5, -2, 3];
    for (const offset of offsets) {
      options.push((year + offset).toString());
    }
  }
  return options;
}

function generateHqOptions(correctHq: string): string[] {
  const hqOptions = [
    'Seattle, Washington',
    'San Francisco, California',
    'New York, New York',
    'Austin, Texas',
    'Boston, Massachusetts',
    'Chicago, Illinois',
    'Los Angeles, California',
    'Atlanta, Georgia',
    'Minneapolis, Minnesota',
    'Ottawa, Ontario, Canada',
    'Vancouver, British Columbia, Canada',
    'Brooklyn, New York',
    'Bentonville, Arkansas',
    'Issaquah, Washington',
    'Beaverton, Oregon',
    'Richfield, Minnesota',
    'Dania Beach, Florida'
  ];
  return hqOptions.filter(hq => hq !== correctHq).slice(0, 3);
}

function generateCeoOptions(correctCeo: string, companySlug: string): string[] {
  const ceoOptions: Record<string, string[]> = {
    shopify: ['Josh Silverman', 'Brian Cornell', 'Doug McMillon'],
    etsy: ['Tobias Lütke', 'Brian Cornell', 'Doug McMillon'],
    wayfair: ['Josh Silverman', 'Brian Cornell', 'Doug McMillon'],
    chewy: ['Niraj Shah', 'Josh Silverman', 'Brian Cornell'],
    target: ['Doug McMillon', 'Ron Vachris', 'Ted Decker'],
    walmart: ['Brian Cornell', 'Ron Vachris', 'Ted Decker'],
    costco: ['Doug McMillon', 'Brian Cornell', 'Ted Decker'],
    'home-depot': ['Doug McMillon', 'Brian Cornell', 'Ron Vachris'],
    'best-buy': ['Doug McMillon', 'Brian Cornell', 'Ted Decker'],
    nike: ['Doug McMillon', 'Calvin McDonald', 'Brian Cornell'],
    lululemon: ['Elliott Hill', 'Doug McMillon', 'Brian Cornell']
  };
  return ceoOptions[companySlug] || ['Doug McMillon', 'Brian Cornell', 'Ted Decker'];
}

function generateProductOptions(correctProduct: string, companySlug: string): string[] {
  const allProducts = [
    'E-commerce Platform', 'Warehouse Clubs', 'Consumer Electronics',
    'Athletic Footwear', 'Home Improvement', 'Pet Food',
    'General Merchandise', 'Yoga Wear', 'Handmade Marketplace',
    'Furniture', 'Tool Rental', 'Geek Squad',
    'Kirkland Signature', 'Air Jordan', 'Mirror Home Gym',
    'Drive Up', 'Autoship Subscriptions', 'Shipt Same-Day Delivery'
  ];
  return allProducts.filter(p => p !== correctProduct).slice(0, 3);
}

function generateAcquisitionOptions(correctAcquisition: string): string[] {
  const acquisitionOptions = [
    'Deliverr', '6 River Systems', 'Oberlo', 'Depop', 'Elo7',
    'Reverb', 'Shipt', 'Flipkart', 'Jet.com', 'Bonobos',
    'Price Club', 'HD Supply', 'Interline Brands', 'GreatCall',
    'Mirror', 'Converse', 'Zodiac', 'Current Health'
  ];
  return acquisitionOptions.filter(a => a !== correctAcquisition).slice(0, 3);
}

function generateCompanyTrivia(slug: string): TriviaItem[] {
  const company = ecommerceCompanies[slug];
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

  const slugs = Object.keys(ecommerceCompanies);
  let totalItems = 0;

  for (const slug of slugs) {
    const items = generateCompanyTrivia(slug);
    const outputPath = path.join(outputDir, `${slug}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Generated ${items.length} trivia items for ${slug}`);
    totalItems += items.length;
  }

  console.log(`\nTotal: ${totalItems} trivia items for ${slugs.length} E-commerce/Retail companies`);
}

main();
