#!/usr/bin/env npx tsx

/**
 * Generate company trivia for Consulting batch
 * Issue #89
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

// Consulting company data
const consultingCompanies: Record<string, {
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
  mckinsey: {
    name: 'McKinsey & Company',
    foundingYear: '1926',
    founders: ['James O. McKinsey'],
    hq: 'New York, New York',
    ceo: 'Bob Sternfels',
    mission: 'To help our clients make distinctive, lasting, and substantial improvements in their performance and to build a great firm that attracts, develops, excites, and retains exceptional people',
    products: ['Strategy Consulting', 'Digital Transformation', 'Operations Consulting', 'McKinsey Digital', 'McKinsey Analytics'],
    acquisitions: [
      { name: 'Quantum Black', year: '2015' },
      { name: 'Iguazio', year: '2022' },
      { name: 'Orpheus', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/McKinsey_%26_Company'
  },
  bcg: {
    name: 'Boston Consulting Group',
    foundingYear: '1963',
    founders: ['Bruce Henderson'],
    hq: 'Boston, Massachusetts',
    ceo: 'Christoph Schweizer',
    mission: 'To unlock the potential of those who advance the world',
    products: ['Strategy Consulting', 'Digital BCG', 'BCG X', 'BCG Gamma', 'Operations Consulting'],
    acquisitions: [
      { name: 'Expand Research', year: '2018' },
      { name: 'Inverto', year: '2016' },
      { name: 'TerraCycle', year: '2023' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Boston_Consulting_Group'
  },
  bain: {
    name: 'Bain & Company',
    foundingYear: '1973',
    founders: ['Bill Bain'],
    hq: 'Boston, Massachusetts',
    ceo: 'Manny Maceda',
    mission: 'We help ambitious organizations become better versions of themselves',
    products: ['Strategy Consulting', 'Performance Improvement', 'Digital Innovation', 'Mergers & Acquisitions', 'Private Equity'],
    acquisitions: [
      { name: 'FRWD', year: '2021' },
      { name: 'Pangea', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Bain_%26_Company'
  },
  deloitte: {
    name: 'Deloitte',
    foundingYear: '1845',
    founders: ['William Welch Deloitte'],
    hq: 'London, United Kingdom',
    ceo: 'Joe Ucuzoglu',
    mission: 'To make an impact that matters for our clients, our people, and society',
    products: ['Audit & Assurance', 'Consulting', 'Tax & Legal', 'Risk Advisory', 'Financial Advisory'],
    acquisitions: [
      { name: 'Monitor Group', year: '2013' },
      { name: 'Hashedln', year: '2021' },
      { name: 'Dataweave', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Deloitte'
  },
  accenture: {
    name: 'Accenture',
    foundingYear: '1989',
    founders: ['Arthur Andersen (spun off)'],
    hq: 'Dublin, Ireland',
    ceo: 'Julie Sweet',
    mission: 'To deliver on the promise of technology and human ingenuity',
    products: ['Strategy Consulting', 'Technology Services', 'Operations', 'Accenture Song', 'Accenture Industry X'],
    acquisitions: [
      { name: 'Droga5', year: '2019' },
      { name: 'Mackevision', year: '2018' },
      { name: 'Avanade', year: '2000' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Accenture'
  },
  pwc: {
    name: 'PwC',
    foundingYear: '1998',
    founders: ['Samuel Lowell Price', 'Edwin Waterhouse (merged firms)'],
    hq: 'London, United Kingdom',
    ceo: 'Mohamed Kande',
    mission: 'To build trust in society and solve important problems',
    products: ['Assurance', 'Consulting', 'Tax & Legal', 'Deals', 'Private Company Services'],
    acquisitions: [
      { name: 'Strategy&', year: '2014' },
      { name: 'Booz & Company', year: '2014' },
      { name: 'Outbox Systems', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/PricewaterhouseCoopers'
  },
  ey: {
    name: 'EY (Ernst & Young)',
    foundingYear: '1989',
    founders: ['Ernst & Whinney', 'Arthur Young (merged)'],
    hq: 'London, United Kingdom',
    ceo: 'Janet Truncale',
    mission: 'Building a better working world',
    products: ['Assurance', 'Consulting', 'Tax', 'Strategy and Transactions', 'Technology'],
    acquisitions: [
      { name: 'Parthenon Group', year: '2014' },
      { name: 'Riverview Law', year: '2018' },
      { name: 'Pangea', year: '2023' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Ernst_%26_Young'
  },
  kpmg: {
    name: 'KPMG',
    foundingYear: '1987',
    founders: ['Peat Marwick', 'KMG (merged)'],
    hq: 'Amstelveen, Netherlands',
    ceo: 'Bill Thomas',
    mission: 'To inspire confidence and empower change',
    products: ['Audit', 'Tax', 'Advisory', 'Deal Advisory', 'Technology & Innovation'],
    acquisitions: [
      { name: 'Cynergy Systems', year: '2021' },
      { name: 'Zinnov', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/KPMG'
  },
  capgemini: {
    name: 'Capgemini',
    foundingYear: '1967',
    founders: ['Serge Kampf'],
    hq: 'Paris, France',
    ceo: 'Aiman Ezzat',
    mission: 'To unleash human energy through technology for an inclusive and sustainable future',
    products: ['Strategy & Transformation', 'Applications & Technology', 'Operations & Engineering', 'Capgemini Invent'],
    acquisitions: [
      { name: 'Altran', year: '2020' },
      { name: 'Igate', year: '2015' },
      { name: 'LiquidHub', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Capgemini'
  },
  'booz-allen': {
    name: 'Booz Allen Hamilton',
    foundingYear: '1914',
    founders: ['Edwin Booz'],
    hq: 'McLean, Virginia',
    ceo: 'Horacio Rozanski',
    mission: 'To empower people to change the world',
    products: ['Defense Consulting', 'Intelligence Services', 'Digital Solutions', 'Engineering', 'Cyber'],
    acquisitions: [
      { name: 'Liberty IT Solutions', year: '2021' },
      { name: 'Tracepoint', year: '2022' },
      { name: 'EverWatch', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Booz_Allen_Hamilton'
  }
};

function generateFoundingTrivia(slug: string, company: typeof consultingCompanies[string]): TriviaItem[] {
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

function generateHqTrivia(slug: string, company: typeof consultingCompanies[string]): TriviaItem[] {
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

function generateExecTrivia(slug: string, company: typeof consultingCompanies[string]): TriviaItem[] {
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

function generateMissionTrivia(slug: string, company: typeof consultingCompanies[string]): TriviaItem[] {
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

function generateProductTrivia(slug: string, company: typeof consultingCompanies[string]): TriviaItem[] {
  const items: TriviaItem[] = [];
  const sourceDate = new Date().toISOString().split('T')[0] ?? null;

  // Quiz: Products
  const mainProduct = company.products[0];
  items.push({
    company_slug: slug,
    fact_type: 'product',
    format: 'quiz',
    question: `Which of these is a ${company.name} practice area?`,
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
    answer: `Key ${company.name} practice areas include ${productsList}.`,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  return items;
}

function generateAcquisitionTrivia(slug: string, company: typeof consultingCompanies[string]): TriviaItem[] {
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
  // For older companies (before 1900), use larger offsets
  if (year < 1900) {
    const offsets = [-20, -10, 15];
    for (const offset of offsets) {
      options.push((year + offset).toString());
    }
  } else if (year < 1950) {
    const offsets = [-10, -5, 8];
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
    'New York, New York',
    'Boston, Massachusetts',
    'London, United Kingdom',
    'Paris, France',
    'Chicago, Illinois',
    'Dublin, Ireland',
    'Amstelveen, Netherlands',
    'McLean, Virginia',
    'Washington, D.C.',
    'San Francisco, California',
    'Singapore',
    'Zurich, Switzerland'
  ];
  return hqOptions.filter(hq => hq !== correctHq).slice(0, 3);
}

function generateCeoOptions(correctCeo: string, companySlug: string): string[] {
  const ceoOptions: Record<string, string[]> = {
    mckinsey: ['Christoph Schweizer', 'Manny Maceda', 'Julie Sweet'],
    bcg: ['Bob Sternfels', 'Manny Maceda', 'Julie Sweet'],
    bain: ['Bob Sternfels', 'Christoph Schweizer', 'Julie Sweet'],
    deloitte: ['Bob Sternfels', 'Julie Sweet', 'Mohamed Kande'],
    accenture: ['Bob Sternfels', 'Christoph Schweizer', 'Joe Ucuzoglu'],
    pwc: ['Bob Sternfels', 'Julie Sweet', 'Joe Ucuzoglu'],
    ey: ['Bob Sternfels', 'Julie Sweet', 'Mohamed Kande'],
    kpmg: ['Bob Sternfels', 'Julie Sweet', 'Joe Ucuzoglu'],
    capgemini: ['Bob Sternfels', 'Julie Sweet', 'Horacio Rozanski'],
    'booz-allen': ['Bob Sternfels', 'Julie Sweet', 'Aiman Ezzat']
  };
  return ceoOptions[companySlug] || ['Bob Sternfels', 'Julie Sweet', 'Christoph Schweizer'];
}

function generateProductOptions(correctProduct: string, companySlug: string): string[] {
  const allProducts = [
    'Strategy Consulting', 'Digital Transformation', 'Operations Consulting',
    'Technology Services', 'Audit & Assurance', 'Tax & Legal',
    'Risk Advisory', 'Financial Advisory', 'Deal Advisory',
    'Mergers & Acquisitions', 'Private Equity', 'Cyber Security',
    'Defense Consulting', 'Intelligence Services', 'Engineering'
  ];
  return allProducts.filter(p => p !== correctProduct).slice(0, 3);
}

function generateAcquisitionOptions(correctAcquisition: string): string[] {
  const acquisitionOptions = [
    'Quantum Black', 'Iguazio', 'Monitor Group', 'Strategy&',
    'Booz & Company', 'Parthenon Group', 'Altran', 'Droga5',
    'Expand Research', 'Inverto', 'FRWD', 'Liberty IT Solutions',
    'Tracepoint', 'EverWatch', 'Riverview Law'
  ];
  return acquisitionOptions.filter(a => a !== correctAcquisition).slice(0, 3);
}

function generateCompanyTrivia(slug: string): TriviaItem[] {
  const company = consultingCompanies[slug];
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

  const slugs = Object.keys(consultingCompanies);
  let totalItems = 0;

  for (const slug of slugs) {
    const items = generateCompanyTrivia(slug);
    const outputPath = path.join(outputDir, `${slug}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Generated ${items.length} trivia items for ${slug}`);
    totalItems += items.length;
  }

  console.log(`\nTotal: ${totalItems} trivia items for ${slugs.length} Consulting companies`);
}

main();
