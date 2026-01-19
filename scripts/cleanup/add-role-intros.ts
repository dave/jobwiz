#!/usr/bin/env npx ts-node

/**
 * Add missing introductions to role modules
 *
 * Adds intro text blocks to:
 * 1. Key Competencies section - explains what competencies are and why they matter
 * 2. Preparation Checklist section - provides context for how/when to use the checklist
 *
 * Issue: #248
 */

import * as fs from 'fs';
import * as path from 'path';

interface ContentBlock {
  type: string;
  content: {
    text?: string;
    title?: string;
    items?: Array<{ id: string; text: string; required: boolean }>;
  };
}

interface Section {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface RoleModule {
  slug: string;
  type: string;
  title: string;
  description: string;
  role_slug: string;
  is_premium: boolean;
  display_order: number;
  sections: Section[];
}

// Role-specific competencies intro templates
const competenciesIntros: Record<string, string> = {
  'account-executive': 'Successful Account Executive interviews evaluate your ability to build relationships, manage complex sales cycles, and drive revenue growth. These are the core competencies interviewers will assess - make sure you have specific examples ready for each.',
  'backend-engineer': 'Backend Engineer interviews assess your ability to build robust, scalable server-side systems. These are the core competencies interviewers will evaluate - make sure you can demonstrate depth in each area with specific examples from your experience.',
  'business-analyst': 'Business Analyst interviews test your ability to bridge business needs and technical solutions. These are the core competencies that interviewers will assess - prepare concrete examples showing how you\'ve applied each one.',
  'data-engineer': 'Data Engineer interviews focus on your ability to design and maintain data infrastructure at scale. These are the core competencies interviewers evaluate - be ready to discuss specific projects where you\'ve demonstrated each skill.',
  'data-scientist': 'Data Scientist interviews assess your ability to extract insights from data and build predictive models. These are the core competencies you\'ll be evaluated on - prepare examples showing how you\'ve applied each in real-world scenarios.',
  'devops-engineer': 'DevOps Engineer interviews evaluate your ability to build reliable, automated infrastructure and deployment pipelines. These are the core competencies interviewers look for - have specific examples ready for each area.',
  'engineering-manager': 'Engineering Manager interviews assess your ability to lead teams, deliver projects, and grow engineers. These are the core competencies interviewers evaluate - prepare specific stories demonstrating each one.',
  'financial-analyst': 'Financial Analyst interviews test your analytical skills, financial modeling abilities, and business acumen. These are the core competencies interviewers assess - be ready to walk through examples demonstrating each.',
  'frontend-engineer': 'Frontend Engineer interviews evaluate your ability to build performant, accessible user interfaces. These are the core competencies interviewers will assess - make sure you can demonstrate depth in each area.',
  'machine-learning-engineer': 'Machine Learning Engineer interviews assess your ability to build and deploy ML systems in production. These are the core competencies interviewers evaluate - prepare examples showing how you\'ve applied each skill.',
  'management-consultant': 'Management Consultant interviews test your problem-solving, communication, and analytical abilities. These are the core competencies interviewers assess - be ready to demonstrate each through case discussions and examples.',
  'marketing-manager': 'Marketing Manager interviews evaluate your ability to drive growth, manage campaigns, and understand customer behavior. These are the core competencies interviewers assess - prepare specific examples for each.',
  'mobile-engineer': 'Mobile Engineer interviews assess your ability to build polished, performant mobile applications. These are the core competencies interviewers will evaluate - have specific examples ready demonstrating each skill.',
  'product-designer': 'Product Designer interviews evaluate your design process, visual skills, and ability to solve user problems. These are the core competencies interviewers assess - prepare portfolio pieces and examples for each.',
  'product-manager': 'Product Manager interviews test your ability to define strategy, prioritize ruthlessly, and ship products. These are the core competencies interviewers evaluate - prepare specific stories demonstrating each one.',
  'qa-engineer': 'QA Engineer interviews assess your testing methodology, automation skills, and quality mindset. These are the core competencies interviewers evaluate - be ready to discuss how you\'ve applied each.',
  'sales-engineer': 'Sales Engineer interviews evaluate your technical depth combined with customer-facing skills. These are the core competencies interviewers assess - prepare examples showing how you\'ve demonstrated each.',
  'security-engineer': 'Security Engineer interviews test your ability to identify vulnerabilities, design secure systems, and respond to threats. These are the core competencies interviewers evaluate - have specific examples ready.',
  'software-engineer': 'Software Engineer interviews evaluate both your technical skills and how you approach problems. These are the core competencies interviewers assess - make sure you can demonstrate depth in each area with specific examples.',
  'solutions-architect': 'Solutions Architect interviews assess your ability to design complex systems and communicate with both technical and business stakeholders. These are the core competencies interviewers evaluate - prepare examples for each.',
  'technical-program-manager': 'Technical Program Manager interviews evaluate your ability to drive complex technical programs across teams. These are the core competencies interviewers assess - prepare specific examples demonstrating each.',
  'ux-researcher': 'UX Researcher interviews test your research methodology, analytical skills, and ability to translate insights into action. These are the core competencies interviewers evaluate - prepare examples from your research portfolio.',
};

// Generic fallback if role not found
const defaultCompetenciesIntro = 'These are the core competencies interviewers will assess during your interview. Make sure you can demonstrate each one with specific examples from your experience.';

// Preparation checklist intro (same for all roles but references the role)
function getPreparationIntro(roleTitle: string): string {
  return `This checklist will help you prepare systematically for your ${roleTitle} interview. Work through each item in the weeks leading up to your interview - don't try to cram everything at the last minute.`;
}

function addIntrosToModule(module: RoleModule): { modified: boolean; changes: string[] } {
  const changes: string[] = [];
  let modified = false;

  // Extract role name from title (e.g., "Software Engineer Interview Guide" -> "Software Engineer")
  const roleTitle = module.title.replace(' Interview Guide', '');
  const roleKey = module.role_slug;

  for (const section of module.sections) {
    // Add intro to Key Competencies section
    if (section.id === 'competencies') {
      const firstBlock = section.blocks[0];
      // Check if first block is already a text intro
      if (firstBlock?.type === 'checklist' || (firstBlock?.type === 'text' && !firstBlock.content.text?.includes('core competencies'))) {
        const introText = competenciesIntros[roleKey] || defaultCompetenciesIntro;
        const introBlock: ContentBlock = {
          type: 'text',
          content: {
            text: introText
          }
        };
        section.blocks.unshift(introBlock);
        changes.push(`Added Key Competencies intro`);
        modified = true;
      }
    }

    // Add intro to Preparation Checklist section
    if (section.id === 'preparation') {
      const firstBlock = section.blocks[0];
      // Check if first block is already a text intro
      if (firstBlock?.type === 'checklist') {
        const introBlock: ContentBlock = {
          type: 'text',
          content: {
            text: getPreparationIntro(roleTitle)
          }
        };
        section.blocks.unshift(introBlock);
        changes.push(`Added Preparation Checklist intro`);
        modified = true;
      }
    }
  }

  return { modified, changes };
}

async function main() {
  const modulesDir = path.join(process.cwd(), 'data/generated/modules');
  const files = fs.readdirSync(modulesDir).filter(f => f.startsWith('role-') && f.endsWith('.json'));

  console.log(`Found ${files.length} role modules to process\n`);

  let totalModified = 0;
  let totalChanges = 0;

  for (const file of files) {
    const filePath = path.join(modulesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const module: RoleModule = JSON.parse(content);

    const { modified, changes } = addIntrosToModule(module);

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(module, null, 2) + '\n');
      console.log(`✓ ${file}`);
      changes.forEach(c => console.log(`  - ${c}`));
      totalModified++;
      totalChanges += changes.length;
    } else {
      console.log(`○ ${file} (no changes needed)`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary:`);
  console.log(`  Modules modified: ${totalModified}/${files.length}`);
  console.log(`  Total changes: ${totalChanges}`);
}

main().catch(console.error);
