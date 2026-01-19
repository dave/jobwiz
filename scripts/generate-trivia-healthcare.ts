#!/usr/bin/env npx tsx

/**
 * Generate company trivia for Healthcare/Biotech batch
 * Issue #91
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

// Healthcare/Biotech company data
const healthcareCompanies: Record<string, {
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
  epic: {
    name: 'Epic Systems',
    foundingYear: '1979',
    founders: ['Judith Faulkner'],
    hq: 'Verona, Wisconsin',
    ceo: 'Judith Faulkner',
    mission: 'To help people get well and to help people stay well',
    products: ['EpicCare', 'MyChart', 'Caboodle', 'Healthy Planet', 'Cosmos'],
    acquisitions: [],
    wikipedia: 'https://en.wikipedia.org/wiki/Epic_Systems'
  },
  cerner: {
    name: 'Cerner',
    foundingYear: '1979',
    founders: ['Neal Patterson', 'Paul Gorup', 'Cliff Illig'],
    hq: 'North Kansas City, Missouri',
    ceo: 'David Feinberg',
    mission: 'To connect every person at every step of their health journey',
    products: ['PowerChart', 'HealtheIntent', 'CommunityWorks', 'Revenue Cycle Management', 'Millennium'],
    acquisitions: [
      { name: 'Siemens Health Services', year: '2015' },
      { name: 'Health Catalyst', year: '2019' },
      { name: 'AbleVets', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Cerner'
  },
  optum: {
    name: 'Optum',
    foundingYear: '2011',
    founders: ['UnitedHealth Group'],
    hq: 'Eden Prairie, Minnesota',
    ceo: 'Amar Desai',
    mission: 'To help make the health system work better for everyone',
    products: ['OptumRx', 'OptumHealth', 'OptumInsight', 'OptumServe', 'OptumBank'],
    acquisitions: [
      { name: 'Change Healthcare', year: '2022' },
      { name: 'DaVita Medical Group', year: '2019' },
      { name: 'Advisory Board Company', year: '2017' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Optum'
  },
  unitedhealth: {
    name: 'UnitedHealth Group',
    foundingYear: '1977',
    founders: ['Richard Burke'],
    hq: 'Minnetonka, Minnesota',
    ceo: 'Andrew Witty',
    mission: 'To help people live healthier lives and to help make the health system work better for everyone',
    products: ['UnitedHealthcare', 'Optum', 'UMR', 'Golden Rule Insurance', 'AARP Medicare Supplement'],
    acquisitions: [
      { name: 'Amil Participacoes', year: '2012' },
      { name: 'Catamaran', year: '2015' },
      { name: 'Surgical Care Affiliates', year: '2017' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/UnitedHealth_Group'
  },
  cvs: {
    name: 'CVS Health',
    foundingYear: '1963',
    founders: ['Stanley Goldstein', 'Sidney Goldstein', 'Ralph Hoagland'],
    hq: 'Woonsocket, Rhode Island',
    ceo: 'Karen Lynch',
    mission: 'To help people on their path to better health',
    products: ['CVS Pharmacy', 'CVS Caremark', 'Aetna', 'MinuteClinic', 'CVS Specialty'],
    acquisitions: [
      { name: 'Aetna', year: '2018' },
      { name: 'Caremark', year: '2007' },
      { name: 'Signify Health', year: '2023' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/CVS_Health'
  },
  'johnson-johnson': {
    name: 'Johnson & Johnson',
    foundingYear: '1886',
    founders: ['Robert Wood Johnson I', 'James Wood Johnson', 'Edward Mead Johnson'],
    hq: 'New Brunswick, New Jersey',
    ceo: 'Joaquin Duato',
    mission: 'To profoundly change the trajectory of health for humanity',
    products: ['Tylenol', 'Band-Aid', 'Neutrogena', 'Janssen Pharmaceuticals', 'DePuy Synthes'],
    acquisitions: [
      { name: 'Actelion', year: '2017' },
      { name: 'Momenta Pharmaceuticals', year: '2020' },
      { name: 'Abiomed', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Johnson_%26_Johnson'
  },
  pfizer: {
    name: 'Pfizer',
    foundingYear: '1849',
    founders: ['Charles Pfizer', 'Charles Erhart'],
    hq: 'New York City, New York',
    ceo: 'Albert Bourla',
    mission: 'To be the premier innovative biopharmaceutical company',
    products: ['Comirnaty (COVID-19 vaccine)', 'Lipitor', 'Viagra', 'Xanax', 'Prevnar'],
    acquisitions: [
      { name: 'Wyeth', year: '2009' },
      { name: 'Hospira', year: '2015' },
      { name: 'Array BioPharma', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Pfizer'
  },
  moderna: {
    name: 'Moderna',
    foundingYear: '2010',
    founders: ['Derrick Rossi', 'Timothy Springer', 'Robert Langer', 'Kenneth Chien'],
    hq: 'Cambridge, Massachusetts',
    ceo: 'Stephane Bancel',
    mission: 'To deliver on the promise of mRNA science to create a new generation of transformative medicines for patients',
    products: ['Spikevax (COVID-19 vaccine)', 'mRNA-1273', 'mRNA Flu Vaccine', 'RSV Vaccine', 'CMV Vaccine'],
    acquisitions: [],
    wikipedia: 'https://en.wikipedia.org/wiki/Moderna'
  },
  illumina: {
    name: 'Illumina',
    foundingYear: '1998',
    founders: ['David Walt', 'John Stuelpnagel', 'Anthony Czarnik', 'Mark Chee', 'Larry Bock'],
    hq: 'San Diego, California',
    ceo: 'Jacob Thaysen',
    mission: 'To unlock the power of the genome',
    products: ['NovaSeq', 'MiSeq', 'NextSeq', 'iSeq', 'DRAGEN'],
    acquisitions: [
      { name: 'GRAIL', year: '2021' },
      { name: 'Pacific Biosciences', year: '2019' },
      { name: 'Verinata Health', year: '2013' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Illumina,_Inc.'
  },
  genentech: {
    name: 'Genentech',
    foundingYear: '1976',
    founders: ['Herbert Boyer', 'Robert Swanson'],
    hq: 'South San Francisco, California',
    ceo: 'Alexander Hardy',
    mission: 'To develop medicines for serious diseases',
    products: ['Herceptin', 'Avastin', 'Rituxan', 'Ocrevus', 'Tecentriq'],
    acquisitions: [],
    wikipedia: 'https://en.wikipedia.org/wiki/Genentech'
  }
};

function generateFoundingTrivia(slug: string, company: typeof healthcareCompanies[string]): TriviaItem[] {
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

function generateHqTrivia(slug: string, company: typeof healthcareCompanies[string]): TriviaItem[] {
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

function generateExecTrivia(slug: string, company: typeof healthcareCompanies[string]): TriviaItem[] {
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

function generateMissionTrivia(slug: string, company: typeof healthcareCompanies[string]): TriviaItem[] {
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

function generateProductTrivia(slug: string, company: typeof healthcareCompanies[string]): TriviaItem[] {
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

function generateAcquisitionTrivia(slug: string, company: typeof healthcareCompanies[string]): TriviaItem[] {
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
    'New York City, New York',
    'San Francisco, California',
    'Boston, Massachusetts',
    'Cambridge, Massachusetts',
    'San Diego, California',
    'South San Francisco, California',
    'Verona, Wisconsin',
    'North Kansas City, Missouri',
    'Eden Prairie, Minnesota',
    'Minnetonka, Minnesota',
    'Woonsocket, Rhode Island',
    'New Brunswick, New Jersey',
    'Indianapolis, Indiana',
    'Philadelphia, Pennsylvania',
    'Chicago, Illinois',
    'Seattle, Washington',
    'Los Angeles, California'
  ];
  return hqOptions.filter(hq => hq !== correctHq).slice(0, 3);
}

function generateCeoOptions(correctCeo: string, companySlug: string): string[] {
  const ceoOptions: Record<string, string[]> = {
    epic: ['David Feinberg', 'Karen Lynch', 'Albert Bourla'],
    cerner: ['Judith Faulkner', 'Karen Lynch', 'Albert Bourla'],
    optum: ['David Feinberg', 'Karen Lynch', 'Andrew Witty'],
    unitedhealth: ['Amar Desai', 'Karen Lynch', 'Albert Bourla'],
    cvs: ['Andrew Witty', 'Albert Bourla', 'Joaquin Duato'],
    'johnson-johnson': ['Albert Bourla', 'Karen Lynch', 'Andrew Witty'],
    pfizer: ['Joaquin Duato', 'Stephane Bancel', 'Karen Lynch'],
    moderna: ['Albert Bourla', 'Joaquin Duato', 'David Feinberg'],
    illumina: ['Albert Bourla', 'Stephane Bancel', 'Alexander Hardy'],
    genentech: ['Jacob Thaysen', 'Stephane Bancel', 'Albert Bourla']
  };
  return ceoOptions[companySlug] || ['Albert Bourla', 'Karen Lynch', 'Andrew Witty'];
}

function generateProductOptions(correctProduct: string, companySlug: string): string[] {
  const allProducts = [
    'EpicCare', 'MyChart', 'PowerChart', 'OptumRx', 'UnitedHealthcare',
    'CVS Pharmacy', 'Aetna', 'Tylenol', 'Lipitor', 'Comirnaty (COVID-19 vaccine)',
    'Spikevax (COVID-19 vaccine)', 'NovaSeq', 'Herceptin', 'Avastin',
    'Band-Aid', 'Neutrogena', 'MinuteClinic', 'Janssen Pharmaceuticals',
    'Viagra', 'Prevnar', 'Rituxan', 'MiSeq', 'Caboodle'
  ];
  return allProducts.filter(p => p !== correctProduct).slice(0, 3);
}

function generateAcquisitionOptions(correctAcquisition: string): string[] {
  const acquisitionOptions = [
    'Aetna', 'Caremark', 'Signify Health', 'Actelion', 'Momenta Pharmaceuticals',
    'Abiomed', 'Wyeth', 'Hospira', 'Array BioPharma', 'GRAIL',
    'Pacific Biosciences', 'Verinata Health', 'Siemens Health Services',
    'Change Healthcare', 'DaVita Medical Group', 'Advisory Board Company',
    'Amil Participacoes', 'Catamaran', 'Surgical Care Affiliates'
  ];
  return acquisitionOptions.filter(a => a !== correctAcquisition).slice(0, 3);
}

function generateCompanyTrivia(slug: string): TriviaItem[] {
  const company = healthcareCompanies[slug];
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

  const slugs = Object.keys(healthcareCompanies);
  let totalItems = 0;

  for (const slug of slugs) {
    const items = generateCompanyTrivia(slug);
    const outputPath = path.join(outputDir, `${slug}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Generated ${items.length} trivia items for ${slug}`);
    totalItems += items.length;
  }

  console.log(`\nTotal: ${totalItems} trivia items for ${slugs.length} Healthcare/Biotech companies`);
}

main();
