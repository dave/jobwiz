#!/usr/bin/env npx tsx

/**
 * Generate company trivia for Big Tech batch
 * Issue #86
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

// Big Tech company data
const bigTechCompanies: Record<string, {
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
  google: {
    name: 'Google',
    foundingYear: '1998',
    founders: ['Larry Page', 'Sergey Brin'],
    hq: 'Mountain View, California',
    ceo: 'Sundar Pichai',
    mission: 'To organize the world\'s information and make it universally accessible and useful',
    products: ['Google Search', 'YouTube', 'Android', 'Google Cloud', 'Gmail', 'Google Maps', 'Chrome'],
    acquisitions: [
      { name: 'YouTube', year: '2006' },
      { name: 'Android', year: '2005' },
      { name: 'DeepMind', year: '2014' },
      { name: 'Fitbit', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Google'
  },
  meta: {
    name: 'Meta',
    foundingYear: '2004',
    founders: ['Mark Zuckerberg', 'Eduardo Saverin', 'Andrew McCollum', 'Dustin Moskovitz', 'Chris Hughes'],
    hq: 'Menlo Park, California',
    ceo: 'Mark Zuckerberg',
    mission: 'To give people the power to build community and bring the world closer together',
    products: ['Facebook', 'Instagram', 'WhatsApp', 'Messenger', 'Meta Quest', 'Threads'],
    acquisitions: [
      { name: 'Instagram', year: '2012' },
      { name: 'WhatsApp', year: '2014' },
      { name: 'Oculus VR', year: '2014' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Meta_Platforms'
  },
  amazon: {
    name: 'Amazon',
    foundingYear: '1994',
    founders: ['Jeff Bezos'],
    hq: 'Seattle, Washington',
    ceo: 'Andy Jassy',
    mission: 'To be Earth\'s most customer-centric company',
    products: ['Amazon.com', 'AWS', 'Prime Video', 'Alexa', 'Kindle', 'Ring', 'Whole Foods Market'],
    acquisitions: [
      { name: 'Whole Foods Market', year: '2017' },
      { name: 'MGM', year: '2022' },
      { name: 'Ring', year: '2018' },
      { name: 'Twitch', year: '2014' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Amazon_(company)'
  },
  apple: {
    name: 'Apple',
    foundingYear: '1976',
    founders: ['Steve Jobs', 'Steve Wozniak', 'Ronald Wayne'],
    hq: 'Cupertino, California',
    ceo: 'Tim Cook',
    mission: 'To bring the best user experience to customers through innovative hardware, software, and services',
    products: ['iPhone', 'Mac', 'iPad', 'Apple Watch', 'AirPods', 'Apple TV', 'iOS', 'macOS'],
    acquisitions: [
      { name: 'Beats Electronics', year: '2014' },
      { name: 'Shazam', year: '2018' },
      { name: 'Intel smartphone modem division', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Apple_Inc.'
  },
  microsoft: {
    name: 'Microsoft',
    foundingYear: '1975',
    founders: ['Bill Gates', 'Paul Allen'],
    hq: 'Redmond, Washington',
    ceo: 'Satya Nadella',
    mission: 'To empower every person and every organization on the planet to achieve more',
    products: ['Windows', 'Microsoft 365', 'Azure', 'Xbox', 'LinkedIn', 'GitHub', 'Teams'],
    acquisitions: [
      { name: 'LinkedIn', year: '2016' },
      { name: 'GitHub', year: '2018' },
      { name: 'Activision Blizzard', year: '2023' },
      { name: 'Nuance Communications', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Microsoft'
  },
  netflix: {
    name: 'Netflix',
    foundingYear: '1997',
    founders: ['Reed Hastings', 'Marc Randolph'],
    hq: 'Los Gatos, California',
    ceo: 'Ted Sarandos and Greg Peters',
    mission: 'To entertain the world',
    products: ['Netflix streaming service', 'Netflix Originals', 'Netflix Games'],
    acquisitions: [
      { name: 'Millarworld', year: '2017' },
      { name: 'Spry Fox', year: '2022' },
      { name: 'Night School Studio', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Netflix'
  },
  nvidia: {
    name: 'NVIDIA',
    foundingYear: '1993',
    founders: ['Jensen Huang', 'Chris Malachowsky', 'Curtis Priem'],
    hq: 'Santa Clara, California',
    ceo: 'Jensen Huang',
    mission: 'To be the world\'s leading visual computing company',
    products: ['GeForce GPUs', 'NVIDIA CUDA', 'NVIDIA AI Enterprise', 'DGX systems', 'RTX graphics cards'],
    acquisitions: [
      { name: 'Mellanox Technologies', year: '2020' },
      { name: 'Arm (attempted)', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Nvidia'
  },
  intel: {
    name: 'Intel',
    foundingYear: '1968',
    founders: ['Gordon Moore', 'Robert Noyce'],
    hq: 'Santa Clara, California',
    ceo: 'Pat Gelsinger',
    mission: 'To create world-changing technology that improves the life of every person on the planet',
    products: ['Intel Core processors', 'Intel Xeon', 'Intel Arc GPUs', 'Intel vPro', 'Intel Optane'],
    acquisitions: [
      { name: 'Altera', year: '2015' },
      { name: 'Mobileye', year: '2017' },
      { name: 'Habana Labs', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Intel'
  },
  amd: {
    name: 'AMD',
    foundingYear: '1969',
    founders: ['Jerry Sanders', 'Ed Turney', 'John Carey', 'Sven Simonsen', 'Jack Gifford'],
    hq: 'Santa Clara, California',
    ceo: 'Lisa Su',
    mission: 'To build great products that accelerate next-generation computing experiences',
    products: ['Ryzen processors', 'EPYC server processors', 'Radeon GPUs', 'Instinct accelerators'],
    acquisitions: [
      { name: 'ATI Technologies', year: '2006' },
      { name: 'Xilinx', year: '2022' },
      { name: 'Pensando Systems', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/AMD'
  },
  cisco: {
    name: 'Cisco',
    foundingYear: '1984',
    founders: ['Leonard Bosack', 'Sandy Lerner'],
    hq: 'San Jose, California',
    ceo: 'Chuck Robbins',
    mission: 'To power an inclusive future for all',
    products: ['Cisco routers', 'Cisco switches', 'WebEx', 'Meraki', 'Cisco Secure'],
    acquisitions: [
      { name: 'Splunk', year: '2024' },
      { name: 'Duo Security', year: '2018' },
      { name: 'AppDynamics', year: '2017' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Cisco'
  },
  tesla: {
    name: 'Tesla',
    foundingYear: '2003',
    founders: ['Martin Eberhard', 'Marc Tarpenning'],
    hq: 'Austin, Texas',
    ceo: 'Elon Musk',
    mission: 'To accelerate the world\'s transition to sustainable energy',
    products: ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Powerwall', 'Solar Roof'],
    acquisitions: [
      { name: 'SolarCity', year: '2016' },
      { name: 'Maxwell Technologies', year: '2019' },
      { name: 'Grohmann Engineering', year: '2017' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Tesla,_Inc.'
  },
  adobe: {
    name: 'Adobe',
    foundingYear: '1982',
    founders: ['John Warnock', 'Charles Geschke'],
    hq: 'San Jose, California',
    ceo: 'Shantanu Narayen',
    mission: 'To change the world through digital experiences',
    products: ['Photoshop', 'Illustrator', 'Premiere Pro', 'Acrobat', 'Adobe Creative Cloud', 'Adobe Experience Cloud'],
    acquisitions: [
      { name: 'Figma (attempted)', year: '2022' },
      { name: 'Magento', year: '2018' },
      { name: 'Marketo', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Adobe_Inc.'
  }
};

function generateFoundingTrivia(slug: string, company: typeof bigTechCompanies[string]): TriviaItem[] {
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

function generateHqTrivia(slug: string, company: typeof bigTechCompanies[string]): TriviaItem[] {
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

function generateExecTrivia(slug: string, company: typeof bigTechCompanies[string]): TriviaItem[] {
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

function generateMissionTrivia(slug: string, company: typeof bigTechCompanies[string]): TriviaItem[] {
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

function generateProductTrivia(slug: string, company: typeof bigTechCompanies[string]): TriviaItem[] {
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

function generateAcquisitionTrivia(slug: string, company: typeof bigTechCompanies[string]): TriviaItem[] {
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
  const offsets = [-5, -2, 3];
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
    'Atlanta, Georgia'
  ];
  return hqOptions.filter(hq => hq !== correctHq).slice(0, 3);
}

function generateCeoOptions(correctCeo: string, companySlug: string): string[] {
  const ceoOptions: Record<string, string[]> = {
    google: ['Tim Cook', 'Satya Nadella', 'Andy Jassy'],
    meta: ['Sundar Pichai', 'Tim Cook', 'Satya Nadella'],
    amazon: ['Jeff Bezos', 'Sundar Pichai', 'Tim Cook'],
    apple: ['Steve Jobs', 'Sundar Pichai', 'Satya Nadella'],
    microsoft: ['Bill Gates', 'Sundar Pichai', 'Tim Cook'],
    netflix: ['Sundar Pichai', 'Tim Cook', 'Satya Nadella'],
    nvidia: ['Sundar Pichai', 'Lisa Su', 'Pat Gelsinger'],
    intel: ['Jensen Huang', 'Lisa Su', 'Satya Nadella'],
    amd: ['Jensen Huang', 'Pat Gelsinger', 'Tim Cook'],
    cisco: ['Tim Cook', 'Sundar Pichai', 'Satya Nadella'],
    tesla: ['Tim Cook', 'Jeff Bezos', 'Mark Zuckerberg'],
    adobe: ['Tim Cook', 'Satya Nadella', 'Sundar Pichai']
  };
  return ceoOptions[companySlug] || ['Tim Cook', 'Satya Nadella', 'Sundar Pichai'];
}

function generateProductOptions(correctProduct: string, companySlug: string): string[] {
  const allProducts = [
    'Slack', 'Zoom', 'Dropbox', 'Salesforce', 'Oracle Database',
    'SAP HANA', 'Workday', 'ServiceNow', 'Tableau', 'Snowflake',
    'Databricks', 'Confluent', 'HashiCorp Vault', 'MongoDB Atlas',
    'Elastic Search', 'Redis', 'Docker', 'Kubernetes'
  ];
  return allProducts.filter(p => p !== correctProduct).slice(0, 3);
}

function generateAcquisitionOptions(correctAcquisition: string): string[] {
  const acquisitionOptions = [
    'Slack', 'Tableau', 'Salesforce', 'ServiceNow',
    'Workday', 'Snowflake', 'Databricks', 'Confluent',
    'MongoDB', 'Elastic', 'Redis Labs', 'HashiCorp',
    'Docker', 'GitLab', 'JFrog', 'Datadog'
  ];
  return acquisitionOptions.filter(a => a !== correctAcquisition).slice(0, 3);
}

function generateCompanyTrivia(slug: string): TriviaItem[] {
  const company = bigTechCompanies[slug];
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

  const slugs = Object.keys(bigTechCompanies);
  let totalItems = 0;

  for (const slug of slugs) {
    const items = generateCompanyTrivia(slug);
    const outputPath = path.join(outputDir, `${slug}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Generated ${items.length} trivia items for ${slug}`);
    totalItems += items.length;
  }

  console.log(`\nTotal: ${totalItems} trivia items for ${slugs.length} Big Tech companies`);
}

main();
