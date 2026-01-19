#!/usr/bin/env npx tsx

/**
 * Generate company trivia for Media/Entertainment batch
 * Issue #93
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

// Media/Entertainment company data
const mediaEntertainmentCompanies: Record<string, {
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
  disney: {
    name: 'Disney',
    foundingYear: '1923',
    founders: ['Walt Disney', 'Roy O. Disney'],
    hq: 'Burbank, California',
    ceo: 'Bob Iger',
    mission: 'To entertain, inform and inspire people around the globe through the power of unparalleled storytelling',
    products: ['Disney+', 'Walt Disney Studios', 'Pixar', 'Marvel Studios', 'Lucasfilm', 'ESPN', 'ABC', 'Disneyland', 'Walt Disney World'],
    acquisitions: [
      { name: '21st Century Fox', year: '2019' },
      { name: 'Lucasfilm', year: '2012' },
      { name: 'Marvel Entertainment', year: '2009' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/The_Walt_Disney_Company'
  },
  'warner-bros-discovery': {
    name: 'Warner Bros. Discovery',
    foundingYear: '2022',
    founders: ['Formed from merger of WarnerMedia and Discovery, Inc.'],
    hq: 'New York, New York',
    ceo: 'David Zaslav',
    mission: 'To be the preeminent global entertainment company',
    products: ['Max', 'HBO', 'Warner Bros. Pictures', 'Discovery Channel', 'CNN', 'TBS', 'TNT', 'DC Studios'],
    acquisitions: [
      { name: 'WarnerMedia (merger)', year: '2022' },
      { name: 'Scripps Networks Interactive', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Warner_Bros._Discovery'
  },
  spotify: {
    name: 'Spotify',
    foundingYear: '2006',
    founders: ['Daniel Ek', 'Martin Lorentzon'],
    hq: 'Stockholm, Sweden',
    ceo: 'Daniel Ek',
    mission: 'To unlock the potential of human creativity by giving a million creative artists the opportunity to live off their art',
    products: ['Spotify Free', 'Spotify Premium', 'Spotify for Artists', 'Spotify for Podcasters', 'Spotify Wrapped'],
    acquisitions: [
      { name: 'Anchor', year: '2019' },
      { name: 'Gimlet Media', year: '2019' },
      { name: 'The Ringer', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Spotify'
  },
  bytedance: {
    name: 'ByteDance',
    foundingYear: '2012',
    founders: ['Zhang Yiming'],
    hq: 'Beijing, China',
    ceo: 'Liang Rubo',
    mission: 'To inspire creativity and bring joy',
    products: ['TikTok', 'Douyin', 'Toutiao', 'CapCut', 'Lark', 'Pico VR'],
    acquisitions: [
      { name: 'Musical.ly', year: '2017' },
      { name: 'Pico', year: '2021' },
      { name: 'Moonton', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/ByteDance'
  },
  snap: {
    name: 'Snap Inc.',
    foundingYear: '2011',
    founders: ['Evan Spiegel', 'Bobby Murphy', 'Reggie Brown'],
    hq: 'Santa Monica, California',
    ceo: 'Evan Spiegel',
    mission: 'To empower people to express themselves, live in the moment, learn about the world, and have fun together',
    products: ['Snapchat', 'Snap Map', 'Snap Spectacles', 'Bitmoji', 'Snap Camera'],
    acquisitions: [
      { name: 'Bitmoji', year: '2016' },
      { name: 'Zenly', year: '2017' },
      { name: 'Voisey', year: '2020' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Snap_Inc.'
  },
  pinterest: {
    name: 'Pinterest',
    foundingYear: '2010',
    founders: ['Ben Silbermann', 'Paul Sciarra', 'Evan Sharp'],
    hq: 'San Francisco, California',
    ceo: 'Bill Ready',
    mission: 'To bring everyone the inspiration to create a life they love',
    products: ['Pinterest', 'Pinterest Lens', 'Pinterest Shopping', 'Idea Pins', 'Pinterest TV'],
    acquisitions: [
      { name: 'THE YES', year: '2022' },
      { name: 'Vochi', year: '2021' },
      { name: 'Instapaper', year: '2016' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Pinterest'
  },
  reddit: {
    name: 'Reddit',
    foundingYear: '2005',
    founders: ['Steve Huffman', 'Alexis Ohanian'],
    hq: 'San Francisco, California',
    ceo: 'Steve Huffman',
    mission: 'To bring community, belonging, and empowerment to everyone in the world',
    products: ['Reddit', 'Reddit Premium', 'Reddit Coins', 'Reddit Awards', 'Reddit Chat'],
    acquisitions: [
      { name: 'Dubsmash', year: '2020' },
      { name: 'Spiketrap', year: '2022' },
      { name: 'MeaningCloud', year: '2022' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Reddit'
  },
  linkedin: {
    name: 'LinkedIn',
    foundingYear: '2002',
    founders: ['Reid Hoffman', 'Allen Blue', 'Konstantin Guericke', 'Eric Ly', 'Jean-Luc Vaillant'],
    hq: 'Sunnyvale, California',
    ceo: 'Ryan Roslansky',
    mission: 'To connect the world\'s professionals to make them more productive and successful',
    products: ['LinkedIn', 'LinkedIn Learning', 'LinkedIn Premium', 'LinkedIn Recruiter', 'LinkedIn Sales Navigator'],
    acquisitions: [
      { name: 'Lynda.com', year: '2015' },
      { name: 'SlideShare', year: '2012' },
      { name: 'Glint', year: '2018' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/LinkedIn'
  },
  x: {
    name: 'X (formerly Twitter)',
    foundingYear: '2006',
    founders: ['Jack Dorsey', 'Noah Glass', 'Biz Stone', 'Evan Williams'],
    hq: 'San Francisco, California',
    ceo: 'Linda Yaccarino',
    mission: 'To give everyone the power to create and share ideas and information instantly, without barriers',
    products: ['X (Twitter)', 'X Premium', 'X Spaces', 'X Communities', 'X Blue'],
    acquisitions: [
      { name: 'Periscope', year: '2015' },
      { name: 'Vine', year: '2012' },
      { name: 'MoPub', year: '2013' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/X_(social_network)'
  },
  ea: {
    name: 'Electronic Arts (EA)',
    foundingYear: '1982',
    founders: ['Trip Hawkins'],
    hq: 'Redwood City, California',
    ceo: 'Andrew Wilson',
    mission: 'To inspire the world to play',
    products: ['EA Sports FC', 'Madden NFL', 'The Sims', 'Apex Legends', 'Battlefield', 'Mass Effect', 'Dragon Age'],
    acquisitions: [
      { name: 'Respawn Entertainment', year: '2017' },
      { name: 'Codemasters', year: '2021' },
      { name: 'Glu Mobile', year: '2021' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Electronic_Arts'
  },
  'activision-blizzard': {
    name: 'Activision Blizzard',
    foundingYear: '2008',
    founders: ['Formed from merger of Activision and Vivendi Games'],
    hq: 'Santa Monica, California',
    ceo: 'Bobby Kotick (until acquisition)',
    mission: 'To connect and engage the world through epic entertainment',
    products: ['Call of Duty', 'World of Warcraft', 'Overwatch', 'Candy Crush', 'Diablo', 'Hearthstone', 'StarCraft'],
    acquisitions: [
      { name: 'King Digital Entertainment', year: '2016' },
      { name: 'Major League Gaming', year: '2016' },
      { name: 'Acquired by Microsoft', year: '2023' }
    ],
    wikipedia: 'https://en.wikipedia.org/wiki/Activision_Blizzard'
  }
};

function generateFoundingTrivia(slug: string, company: typeof mediaEntertainmentCompanies[string]): TriviaItem[] {
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

function generateHqTrivia(slug: string, company: typeof mediaEntertainmentCompanies[string]): TriviaItem[] {
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

function generateExecTrivia(slug: string, company: typeof mediaEntertainmentCompanies[string]): TriviaItem[] {
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

function generateMissionTrivia(slug: string, company: typeof mediaEntertainmentCompanies[string]): TriviaItem[] {
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

function generateProductTrivia(slug: string, company: typeof mediaEntertainmentCompanies[string]): TriviaItem[] {
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

function generateAcquisitionTrivia(slug: string, company: typeof mediaEntertainmentCompanies[string]): TriviaItem[] {
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
    'Los Angeles, California',
    'Seattle, Washington',
    'Austin, Texas',
    'Boston, Massachusetts',
    'Mountain View, California',
    'Palo Alto, California',
    'Burbank, California',
    'Santa Monica, California',
    'Redwood City, California',
    'Sunnyvale, California',
    'Stockholm, Sweden',
    'Beijing, China',
    'London, United Kingdom'
  ];
  return hqOptions.filter(hq => hq !== correctHq).slice(0, 3);
}

function generateCeoOptions(correctCeo: string, companySlug: string): string[] {
  const ceoOptions: Record<string, string[]> = {
    disney: ['David Zaslav', 'Reed Hastings', 'Tim Cook'],
    'warner-bros-discovery': ['Bob Iger', 'Reed Hastings', 'Brian Roberts'],
    spotify: ['Reed Hastings', 'Evan Spiegel', 'Mark Zuckerberg'],
    bytedance: ['Daniel Ek', 'Mark Zuckerberg', 'Evan Spiegel'],
    snap: ['Mark Zuckerberg', 'Ben Silbermann', 'Steve Huffman'],
    pinterest: ['Evan Spiegel', 'Steve Huffman', 'Mark Zuckerberg'],
    reddit: ['Ben Silbermann', 'Evan Spiegel', 'Jack Dorsey'],
    linkedin: ['Mark Zuckerberg', 'Steve Huffman', 'Jeff Weiner'],
    x: ['Elon Musk', 'Jack Dorsey', 'Mark Zuckerberg'],
    ea: ['Bobby Kotick', 'Phil Spencer', 'Satya Nadella'],
    'activision-blizzard': ['Andrew Wilson', 'Phil Spencer', 'Jim Ryan']
  };
  return ceoOptions[companySlug] || ['Mark Zuckerberg', 'Evan Spiegel', 'Reed Hastings'];
}

function generateProductOptions(correctProduct: string, companySlug: string): string[] {
  const allProducts = [
    'Netflix', 'Hulu', 'Amazon Prime Video', 'Apple TV+', 'YouTube',
    'Facebook', 'Instagram', 'WhatsApp', 'TikTok', 'Snapchat',
    'Twitch', 'Discord', 'Steam', 'PlayStation Network', 'Xbox Game Pass',
    'Fortnite', 'League of Legends', 'Roblox', 'Minecraft', 'Among Us'
  ];
  return allProducts.filter(p => p !== correctProduct).slice(0, 3);
}

function generateAcquisitionOptions(correctAcquisition: string): string[] {
  const acquisitionOptions = [
    'Lucasfilm', 'Marvel', 'Pixar', '21st Century Fox', 'MGM',
    'Twitch', 'Instagram', 'WhatsApp', 'YouTube', 'LinkedIn',
    'Spotify', 'Discord', 'Snap', 'Pinterest', 'Reddit',
    'King', 'Zynga', 'Bungie', 'Bethesda', 'Activision Blizzard'
  ];
  return acquisitionOptions.filter(a => a !== correctAcquisition).slice(0, 3);
}

function generateCompanyTrivia(slug: string): TriviaItem[] {
  const company = mediaEntertainmentCompanies[slug];
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

  const slugs = Object.keys(mediaEntertainmentCompanies);
  let totalItems = 0;

  for (const slug of slugs) {
    const items = generateCompanyTrivia(slug);
    const outputPath = path.join(outputDir, `${slug}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    console.log(`Generated ${items.length} trivia items for ${slug}`);
    totalItems += items.length;
  }

  console.log(`\nTotal: ${totalItems} trivia items for ${slugs.length} Media/Entertainment companies`);
}

main();
