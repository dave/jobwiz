#!/usr/bin/env npx tsx

/**
 * Generate company trivia for Finance batch
 * Issue #88
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

// Finance company data
const financeCompanies: Record<string, {
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
  'goldman-sachs': {
    name: 'Goldman Sachs',
    foundingYear: '1869',
    founders: ['Marcus Goldman'],
    hq: 'New York, New York',
    ceo: 'David Solomon',
    mission: 'To advance sustainable economic growth and financial opportunity',
    products: ['Investment Banking', 'Asset Management', 'Securities', 'Consumer Banking (Marcus)', 'Wealth Management'],
    acquisitions: [
      { name: 'United Capital', year: '2019' },
      { name: 'GreenSky', year: '2022' },
      { name: 'NextCapital Group', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Goldman_Sachs'
  },
  jpmorgan: {
    name: 'JPMorgan Chase',
    foundingYear: '1799',
    founders: ['Aaron Burr'],
    hq: 'New York, New York',
    ceo: 'Jamie Dimon',
    mission: 'To be the best financial services company in the world',
    products: ['Commercial Banking', 'Consumer Banking', 'Investment Banking', 'Asset Management', 'Chase Bank'],
    acquisitions: [
      { name: 'First Republic Bank', year: '2023' },
      { name: 'Bear Stearns', year: '2008' },
      { name: 'Washington Mutual', year: '2008' },
      { name: 'InstaMed', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/JPMorgan_Chase'
  },
  'morgan-stanley': {
    name: 'Morgan Stanley',
    foundingYear: '1935',
    founders: ['Henry S. Morgan', 'Harold Stanley', 'others from J.P. Morgan'],
    hq: 'New York, New York',
    ceo: 'Ted Pick',
    mission: 'To provide first-class service in a first-class way',
    products: ['Wealth Management', 'Investment Banking', 'Institutional Securities', 'Investment Management'],
    acquisitions: [
      { name: 'E*TRADE', year: '2020' },
      { name: 'Eaton Vance', year: '2021' },
      { name: 'Solium', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Morgan_Stanley'
  },
  'bank-of-america': {
    name: 'Bank of America',
    foundingYear: '1904',
    founders: ['Amadeo Giannini'],
    hq: 'Charlotte, North Carolina',
    ceo: 'Brian Moynihan',
    mission: 'To help make financial lives better through the power of every connection',
    products: ['Consumer Banking', 'Merrill Lynch', 'Global Banking', 'Global Markets', 'Wealth Management'],
    acquisitions: [
      { name: 'Merrill Lynch', year: '2009' },
      { name: 'Countrywide Financial', year: '2008' },
      { name: 'MBNA', year: '2006' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Bank_of_America'
  },
  citadel: {
    name: 'Citadel',
    foundingYear: '1990',
    founders: ['Kenneth C. Griffin'],
    hq: 'Miami, Florida',
    ceo: 'Kenneth C. Griffin',
    mission: 'To be the most successful investment firm in the world',
    products: ['Hedge Fund', 'Market Making (Citadel Securities)', 'Quantitative Trading'],
    acquisitions: [
      { name: 'IMC Financial Markets', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Citadel_LLC'
  },
  'two-sigma': {
    name: 'Two Sigma',
    foundingYear: '2001',
    founders: ['David Siegel', 'John Overdeck'],
    hq: 'New York, New York',
    ceo: 'David Siegel',
    mission: 'To use data science and technology to drive better investment decisions',
    products: ['Quantitative Hedge Fund', 'Venture Capital', 'Private Equity'],
    acquisitions: [],
    wikipedia: 'https://en.wikipedia.org/wiki/Two_Sigma'
  },
  'jane-street': {
    name: 'Jane Street',
    foundingYear: '2000',
    founders: ['Tim Reynolds', 'Rob Granieri', 'Marc Gerstein', 'Michael Jenkins'],
    hq: 'New York, New York',
    ceo: 'No formal CEO (partnership structure)',
    mission: 'To be the best at trading and technology',
    products: ['Quantitative Trading', 'Market Making', 'ETF Trading'],
    acquisitions: [],
    wikipedia: 'https://en.wikipedia.org/wiki/Jane_Street_Capital'
  },
  blackrock: {
    name: 'BlackRock',
    foundingYear: '1988',
    founders: ['Larry Fink', 'Robert S. Kapito', 'Susan Wagner', 'others'],
    hq: 'New York, New York',
    ceo: 'Larry Fink',
    mission: 'To help more and more people experience financial well-being',
    products: ['iShares ETFs', 'Aladdin Platform', 'Asset Management', 'Risk Management'],
    acquisitions: [
      { name: 'Global Infrastructure Partners', year: '2024' },
      { name: 'eFront', year: '2019' },
      { name: 'BGI', year: '2009' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/BlackRock'
  },
  fidelity: {
    name: 'Fidelity Investments',
    foundingYear: '1946',
    founders: ['Edward C. Johnson II'],
    hq: 'Boston, Massachusetts',
    ceo: 'Abigail Johnson',
    mission: 'To inspire better futures and deliver better outcomes',
    products: ['Mutual Funds', 'Brokerage Services', 'Retirement Services', 'Wealth Management', 'Fidelity Digital Assets'],
    acquisitions: [
      { name: 'eMoney Advisor', year: '2015' },
      { name: 'Fidelity National Information Services (stake)', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Fidelity_Investments'
  },
  schwab: {
    name: 'Charles Schwab',
    foundingYear: '1971',
    founders: ['Charles R. Schwab'],
    hq: 'Westlake, Texas',
    ceo: 'Walt Bettinger',
    mission: 'To provide the most useful and ethical financial services in the world',
    products: ['Brokerage Services', 'Banking', 'Financial Advisory', 'Retirement Plans'],
    acquisitions: [
      { name: 'TD Ameritrade', year: '2020' },
      { name: 'USAA Investment Management Company', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Charles_Schwab_Corporation'
  },
  visa: {
    name: 'Visa',
    foundingYear: '1958',
    founders: ['Dee Hock'],
    hq: 'San Francisco, California',
    ceo: 'Ryan McInerney',
    mission: 'To connect the world through the most innovative, convenient, reliable, and secure payments network',
    products: ['Credit Cards', 'Debit Cards', 'Visa Direct', 'Visa B2B Connect', 'CyberSource'],
    acquisitions: [
      { name: 'Plaid (attempted)', year: '2020' },
      { name: 'Visa Europe', year: '2016' },
      { name: 'CyberSource', year: '2010' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Visa_Inc.'
  },
  mastercard: {
    name: 'Mastercard',
    foundingYear: '1966',
    founders: ['United California Bank', 'Wells Fargo', 'Crocker National Bank', 'Bank of California'],
    hq: 'Purchase, New York',
    ceo: 'Michael Miebach',
    mission: 'To connect and power an inclusive, digital economy that benefits everyone, everywhere',
    products: ['Credit Cards', 'Debit Cards', 'Mastercard Send', 'Mastercard Track', 'Vocalink'],
    acquisitions: [
      { name: 'Finicity', year: '2020' },
      { name: 'Vocalink', year: '2017' },
      { name: 'Transfast', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Mastercard'
  },
  paypal: {
    name: 'PayPal',
    foundingYear: '1998',
    founders: ['Peter Thiel', 'Max Levchin', 'Luke Nosek', 'Ken Howery', 'Elon Musk', 'others'],
    hq: 'San Jose, California',
    ceo: 'Alex Chriss',
    mission: 'To democratize financial services and ensure that everyone has access to affordable, convenient, and secure products and services',
    products: ['PayPal', 'Venmo', 'Braintree', 'Xoom', 'Honey', 'PayPal Credit'],
    acquisitions: [
      { name: 'Honey', year: '2020' },
      { name: 'iZettle', year: '2018' },
      { name: 'Braintree', year: '2013' },
      { name: 'Venmo (via Braintree)', year: '2013' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/PayPal'
  },
  block: {
    name: 'Block (Square)',
    foundingYear: '2009',
    founders: ['Jack Dorsey', 'Jim McKelvey'],
    hq: 'San Francisco, California',
    ceo: 'Jack Dorsey',
    mission: 'To make commerce easy',
    products: ['Square', 'Cash App', 'Afterpay', 'TIDAL', 'TBD', 'Spiral'],
    acquisitions: [
      { name: 'Afterpay', year: '2022' },
      { name: 'TIDAL', year: '2021' },
      { name: 'Credit Karma Tax', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Block,_Inc.'
  }
};

function generateFoundingTrivia(slug: string, company: typeof financeCompanies[string]): TriviaItem[] {
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

function generateHqTrivia(slug: string, company: typeof financeCompanies[string]): TriviaItem[] {
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

function generateExecTrivia(slug: string, company: typeof financeCompanies[string]): TriviaItem[] {
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

function generateMissionTrivia(slug: string, company: typeof financeCompanies[string]): TriviaItem[] {
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

function generateProductTrivia(slug: string, company: typeof financeCompanies[string]): TriviaItem[] {
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
  const productsList = company.products.slice(0, 5).join(', ');
  items.push({
    company_slug: slug,
    fact_type: 'product',
    format: 'factoid',
    question: null,
    answer: `Key ${company.name} products and services include ${productsList}.`,
    options: null,
    source_url: company.wikipedia,
    source_date: sourceDate
  });

  return items;
}

function generateAcquisitionTrivia(slug: string, company: typeof financeCompanies[string]): TriviaItem[] {
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
    'San Francisco, California',
    'Chicago, Illinois',
    'Boston, Massachusetts',
    'Charlotte, North Carolina',
    'Greenwich, Connecticut',
    'Jersey City, New Jersey',
    'Miami, Florida',
    'Los Angeles, California',
    'Dallas, Texas',
    'Westlake, Texas',
    'Purchase, New York',
    'San Jose, California',
    'Stamford, Connecticut'
  ];
  return hqOptions.filter(hq => hq !== correctHq).slice(0, 3);
}

function generateCeoOptions(correctCeo: string, companySlug: string): string[] {
  const ceoOptions: Record<string, string[]> = {
    'goldman-sachs': ['Jamie Dimon', 'Larry Fink', 'Brian Moynihan'],
    jpmorgan: ['David Solomon', 'Larry Fink', 'Brian Moynihan'],
    'morgan-stanley': ['David Solomon', 'Jamie Dimon', 'Larry Fink'],
    'bank-of-america': ['Jamie Dimon', 'David Solomon', 'Larry Fink'],
    citadel: ['David Solomon', 'Jamie Dimon', 'Larry Fink'],
    'two-sigma': ['Kenneth C. Griffin', 'Jamie Dimon', 'Larry Fink'],
    'jane-street': ['David Solomon', 'Jamie Dimon', 'Kenneth C. Griffin'],
    blackrock: ['Jamie Dimon', 'David Solomon', 'Brian Moynihan'],
    fidelity: ['Jamie Dimon', 'Larry Fink', 'Walt Bettinger'],
    schwab: ['Jamie Dimon', 'Larry Fink', 'Brian Moynihan'],
    visa: ['Jamie Dimon', 'Michael Miebach', 'Dan Schulman'],
    mastercard: ['Ryan McInerney', 'Dan Schulman', 'Jack Dorsey'],
    paypal: ['Dan Schulman', 'Jack Dorsey', 'Michael Miebach'],
    block: ['Dan Schulman', 'Alex Chriss', 'Michael Miebach']
  };
  return ceoOptions[companySlug] || ['Jamie Dimon', 'David Solomon', 'Larry Fink'];
}

function generateProductOptions(correctProduct: string, companySlug: string): string[] {
  const allProducts = [
    'Fidelity Funds', 'Vanguard ETFs', 'Schwab Brokerage', 'Robinhood Gold',
    'E*TRADE', 'TD Ameritrade', 'Interactive Brokers', 'Wealthfront',
    'Betterment', 'Personal Capital', 'SoFi', 'Acorns',
    'Stripe Payments', 'Adyen', 'Worldpay', 'FIS'
  ];
  return allProducts.filter(p => p !== correctProduct).slice(0, 3);
}

function generateAcquisitionOptions(correctAcquisition: string): string[] {
  const acquisitionOptions = [
    'Robinhood', 'Wealthfront', 'Betterment', 'Personal Capital',
    'SoFi', 'Acorns', 'Stash', 'Public',
    'Interactive Brokers', 'TradeStation', 'Ally Invest', 'Webull',
    'Stripe', 'Adyen', 'Worldpay', 'Global Payments'
  ];
  return acquisitionOptions.filter(a => a !== correctAcquisition).slice(0, 3);
}

function generateCompanyTrivia(slug: string): TriviaItem[] {
  const company = financeCompanies[slug];
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

  const slugs = Object.keys(financeCompanies);
  let totalItems = 0;

  for (const slug of slugs) {
    const items = generateCompanyTrivia(slug);
    const outputPath = path.join(outputDir, `${slug}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Generated ${items.length} trivia items for ${slug}`);
    totalItems += items.length;
  }

  console.log(`\nTotal: ${totalItems} trivia items for ${slugs.length} Finance companies`);
}

main();
