#!/usr/bin/env npx tsx

/**
 * Generate company trivia for Enterprise SaaS batch
 * Issue #92
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

// Enterprise SaaS company data
const enterpriseSaasCompanies: Record<string, {
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
  salesforce: {
    name: 'Salesforce',
    foundingYear: '1999',
    founders: ['Marc Benioff', 'Parker Harris', 'Dave Moellenhoff', 'Frank Dominguez'],
    hq: 'San Francisco, California',
    ceo: 'Marc Benioff',
    mission: 'To empower companies to connect with their customers in a whole new way',
    products: ['Sales Cloud', 'Service Cloud', 'Marketing Cloud', 'Slack', 'Tableau', 'MuleSoft', 'Einstein AI'],
    acquisitions: [
      { name: 'Slack', year: '2021' },
      { name: 'Tableau', year: '2019' },
      { name: 'MuleSoft', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Salesforce'
  },
  oracle: {
    name: 'Oracle',
    foundingYear: '1977',
    founders: ['Larry Ellison', 'Bob Miner', 'Ed Oates'],
    hq: 'Austin, Texas',
    ceo: 'Safra Catz',
    mission: 'To help people see data in new ways, discover insights, and unlock endless possibilities',
    products: ['Oracle Database', 'Oracle Cloud', 'Java', 'MySQL', 'NetSuite', 'Cerner'],
    acquisitions: [
      { name: 'Cerner', year: '2022' },
      { name: 'NetSuite', year: '2016' },
      { name: 'Sun Microsystems', year: '2010' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Oracle_Corporation'
  },
  sap: {
    name: 'SAP',
    foundingYear: '1972',
    founders: ['Dietmar Hopp', 'Hasso Plattner', 'Hans-Werner Hector', 'Klaus Tschira', 'Claus Wellenreuther'],
    hq: 'Walldorf, Germany',
    ceo: 'Christian Klein',
    mission: 'To help the world run better and improve people\'s lives',
    products: ['SAP S/4HANA', 'SAP SuccessFactors', 'SAP Ariba', 'SAP Concur', 'SAP Business Technology Platform'],
    acquisitions: [
      { name: 'Qualtrics', year: '2019' },
      { name: 'Concur', year: '2014' },
      { name: 'Ariba', year: '2012' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/SAP'
  },
  workday: {
    name: 'Workday',
    foundingYear: '2005',
    founders: ['Dave Duffield', 'Aneel Bhusri'],
    hq: 'Pleasanton, California',
    ceo: 'Carl Eschenbach',
    mission: 'To put people at the center of enterprise software',
    products: ['Workday HCM', 'Workday Financial Management', 'Workday Adaptive Planning', 'Workday Prism Analytics'],
    acquisitions: [
      { name: 'VNDLY', year: '2021' },
      { name: 'Peakon', year: '2021' },
      { name: 'Adaptive Insights', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Workday,_Inc.'
  },
  servicenow: {
    name: 'ServiceNow',
    foundingYear: '2004',
    founders: ['Fred Luddy'],
    hq: 'Santa Clara, California',
    ceo: 'Bill McDermott',
    mission: 'To make the world of work, work better for people',
    products: ['IT Service Management', 'IT Operations Management', 'Customer Service Management', 'Now Platform'],
    acquisitions: [
      { name: 'Element AI', year: '2021' },
      { name: 'Lightstep', year: '2021' },
      { name: 'Loom Systems', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/ServiceNow'
  },
  atlassian: {
    name: 'Atlassian',
    foundingYear: '2002',
    founders: ['Mike Cannon-Brookes', 'Scott Farquhar'],
    hq: 'Sydney, Australia',
    ceo: 'Mike Cannon-Brookes and Scott Farquhar (co-CEOs)',
    mission: 'To unleash the potential of every team',
    products: ['Jira', 'Confluence', 'Trello', 'Bitbucket', 'Jira Service Management', 'Opsgenie'],
    acquisitions: [
      { name: 'Trello', year: '2017' },
      { name: 'Opsgenie', year: '2018' },
      { name: 'Loom', year: '2023' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Atlassian'
  },
  splunk: {
    name: 'Splunk',
    foundingYear: '2003',
    founders: ['Michael Baum', 'Rob Das', 'Erik Swan'],
    hq: 'San Francisco, California',
    ceo: 'Gary Steele',
    mission: 'To remove the barriers between data and action',
    products: ['Splunk Enterprise', 'Splunk Cloud', 'Splunk SOAR', 'Splunk Observability Cloud'],
    acquisitions: [
      { name: 'SignalFx', year: '2019' },
      { name: 'Phantom Cyber', year: '2018' },
      { name: 'VictorOps', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Splunk'
  },
  twilio: {
    name: 'Twilio',
    foundingYear: '2008',
    founders: ['Jeff Lawson', 'Evan Cooke', 'John Wolthuis'],
    hq: 'San Francisco, California',
    ceo: 'Khozema Shipchandler',
    mission: 'To fuel the future of communications',
    products: ['Twilio Programmable Voice', 'Twilio SMS', 'Twilio Flex', 'Twilio SendGrid', 'Twilio Segment'],
    acquisitions: [
      { name: 'Segment', year: '2020' },
      { name: 'SendGrid', year: '2019' },
      { name: 'Zipwhip', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Twilio'
  },
  hubspot: {
    name: 'HubSpot',
    foundingYear: '2006',
    founders: ['Brian Halligan', 'Dharmesh Shah'],
    hq: 'Cambridge, Massachusetts',
    ceo: 'Yamini Rangan',
    mission: 'To help millions of organizations grow better',
    products: ['Marketing Hub', 'Sales Hub', 'Service Hub', 'CMS Hub', 'Operations Hub'],
    acquisitions: [
      { name: 'Clearbit', year: '2023' },
      { name: 'The Hustle', year: '2021' },
      { name: 'PieSync', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/HubSpot'
  },
  zendesk: {
    name: 'Zendesk',
    foundingYear: '2007',
    founders: ['Mikkel Svane', 'Morten Primdahl', 'Alexander Aghassipour'],
    hq: 'San Francisco, California',
    ceo: 'Tom Eggemeier',
    mission: 'To simplify the complexity of business and make it easy for companies to connect with their customers',
    products: ['Zendesk Support', 'Zendesk Sell', 'Zendesk Guide', 'Zendesk Chat', 'Zendesk Explore'],
    acquisitions: [
      { name: 'Momentive', year: '2022' },
      { name: 'Cleverly', year: '2022' },
      { name: 'Smooch', year: '2019' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Zendesk'
  },
  okta: {
    name: 'Okta',
    foundingYear: '2009',
    founders: ['Todd McKinnon', 'Frederic Kerrest'],
    hq: 'San Francisco, California',
    ceo: 'Todd McKinnon',
    mission: 'To free everyone to safely use any technology',
    products: ['Okta Identity Cloud', 'Okta Workforce Identity', 'Okta Customer Identity', 'Auth0'],
    acquisitions: [
      { name: 'Auth0', year: '2021' },
      { name: 'Azuqua', year: '2019' },
      { name: 'ScaleFT', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Okta_(company)'
  },
  cloudflare: {
    name: 'Cloudflare',
    foundingYear: '2009',
    founders: ['Matthew Prince', 'Lee Holloway', 'Michelle Zatlyn'],
    hq: 'San Francisco, California',
    ceo: 'Matthew Prince',
    mission: 'To help build a better Internet',
    products: ['Cloudflare CDN', 'Cloudflare Workers', 'Cloudflare Zero Trust', 'Cloudflare R2', 'Cloudflare Pages'],
    acquisitions: [
      { name: 'Area 1 Security', year: '2022' },
      { name: 'Vectrix', year: '2022' },
      { name: 'Zaraz', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Cloudflare'
  },
  mongodb: {
    name: 'MongoDB',
    foundingYear: '2007',
    founders: ['Dwight Merriman', 'Eliot Horowitz', 'Kevin Ryan'],
    hq: 'New York, New York',
    ceo: 'Dev Ittycheria',
    mission: 'To empower innovators to create, transform, and disrupt industries',
    products: ['MongoDB Atlas', 'MongoDB Enterprise', 'MongoDB Community', 'MongoDB Realm'],
    acquisitions: [
      { name: 'Realm', year: '2019' },
      { name: 'mLab', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/MongoDB_Inc.'
  },
  elastic: {
    name: 'Elastic',
    foundingYear: '2012',
    founders: ['Shay Banon'],
    hq: 'Mountain View, California',
    ceo: 'Ash Kulkarni',
    mission: 'To make real-time data actionable at scale',
    products: ['Elasticsearch', 'Elastic Cloud', 'Kibana', 'Logstash', 'Elastic Security'],
    acquisitions: [
      { name: 'Endgame', year: '2019' },
      { name: 'Swiftype', year: '2017' },
      { name: 'Opbeat', year: '2017' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Elastic_NV'
  }
};

function generateFoundingTrivia(slug: string, company: typeof enterpriseSaasCompanies[string]): TriviaItem[] {
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

function generateHqTrivia(slug: string, company: typeof enterpriseSaasCompanies[string]): TriviaItem[] {
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

function generateExecTrivia(slug: string, company: typeof enterpriseSaasCompanies[string]): TriviaItem[] {
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

function generateMissionTrivia(slug: string, company: typeof enterpriseSaasCompanies[string]): TriviaItem[] {
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

function generateProductTrivia(slug: string, company: typeof enterpriseSaasCompanies[string]): TriviaItem[] {
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

function generateAcquisitionTrivia(slug: string, company: typeof enterpriseSaasCompanies[string]): TriviaItem[] {
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
  // For older companies (before 1990), use larger offsets
  if (year < 1990) {
    const offsets = [-8, -4, 5];
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
    'San Francisco, California',
    'New York, New York',
    'Seattle, Washington',
    'Austin, Texas',
    'Boston, Massachusetts',
    'Cambridge, Massachusetts',
    'Mountain View, California',
    'Palo Alto, California',
    'San Jose, California',
    'Santa Clara, California',
    'Pleasanton, California',
    'Sydney, Australia',
    'Walldorf, Germany',
    'Denver, Colorado',
    'Chicago, Illinois'
  ];
  return hqOptions.filter(hq => hq !== correctHq).slice(0, 3);
}

function generateCeoOptions(correctCeo: string, companySlug: string): string[] {
  const ceoOptions: Record<string, string[]> = {
    salesforce: ['Satya Nadella', 'Larry Ellison', 'Safra Catz'],
    oracle: ['Marc Benioff', 'Bill McDermott', 'Satya Nadella'],
    sap: ['Marc Benioff', 'Larry Ellison', 'Bill McDermott'],
    workday: ['Marc Benioff', 'Aneel Bhusri', 'Christian Klein'],
    servicenow: ['Marc Benioff', 'Christian Klein', 'Carl Eschenbach'],
    atlassian: ['Marc Benioff', 'Stewart Butterfield', 'Jeff Lawson'],
    splunk: ['Marc Benioff', 'Jeff Lawson', 'Todd McKinnon'],
    twilio: ['Marc Benioff', 'Gary Steele', 'Todd McKinnon'],
    hubspot: ['Brian Halligan', 'Marc Benioff', 'Jeff Lawson'],
    zendesk: ['Mikkel Svane', 'Marc Benioff', 'Jeff Lawson'],
    okta: ['Marc Benioff', 'Matthew Prince', 'Jeff Lawson'],
    cloudflare: ['Todd McKinnon', 'Marc Benioff', 'Jeff Lawson'],
    mongodb: ['Marc Benioff', 'Shay Banon', 'Matthew Prince'],
    elastic: ['Dev Ittycheria', 'Marc Benioff', 'Matthew Prince']
  };
  return ceoOptions[companySlug] || ['Marc Benioff', 'Larry Ellison', 'Satya Nadella'];
}

function generateProductOptions(correctProduct: string, companySlug: string): string[] {
  const allProducts = [
    'Microsoft Dynamics', 'SAP SuccessFactors', 'Oracle Cloud', 'Workday HCM',
    'ServiceNow ITSM', 'Jira', 'Confluence', 'Slack', 'Asana', 'Monday.com',
    'Datadog', 'New Relic', 'Sumo Logic', 'PagerDuty', 'Dynatrace',
    'AWS Lambda', 'Azure Functions', 'Google Cloud Run', 'Heroku',
    'Stripe', 'Twilio', 'SendGrid', 'Mailchimp', 'Marketo'
  ];
  return allProducts.filter(p => p !== correctProduct).slice(0, 3);
}

function generateAcquisitionOptions(correctAcquisition: string): string[] {
  const acquisitionOptions = [
    'Slack', 'Trello', 'GitHub', 'LinkedIn', 'Tableau',
    'MuleSoft', 'Segment', 'SendGrid', 'Qualtrics', 'Concur',
    'Auth0', 'Opsgenie', 'SignalFx', 'PagerDuty', 'Datadog',
    'Splunk', 'Elastic', 'MongoDB Atlas', 'Redis Labs', 'Confluent'
  ];
  return acquisitionOptions.filter(a => a !== correctAcquisition).slice(0, 3);
}

function generateCompanyTrivia(slug: string): TriviaItem[] {
  const company = enterpriseSaasCompanies[slug];
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

  const slugs = Object.keys(enterpriseSaasCompanies);
  let totalItems = 0;

  for (const slug of slugs) {
    const items = generateCompanyTrivia(slug);
    const outputPath = path.join(outputDir, `${slug}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Generated ${items.length} trivia items for ${slug}`);
    totalItems += items.length;
  }

  console.log(`\nTotal: ${totalItems} trivia items for ${slugs.length} Enterprise SaaS companies`);
}

main();
