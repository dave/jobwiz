#!/usr/bin/env npx tsx
/**
 * Add video placeholder blocks to universal and role modules
 *
 * This script adds placeholder video blocks for future content:
 * - Introduction videos to each module
 * - Technique demonstration placeholders
 * - Example answer walkthroughs
 *
 * Video URLs use placeholder format: placeholder://video/{category}/{slug}
 * This allows easy replacement with real YouTube/Vimeo URLs later.
 *
 * Usage:
 *   npx tsx scripts/add-video-placeholders.ts [--dry-run]
 */

import fs from 'fs';
import path from 'path';

const MODULES_DIR = path.join(process.cwd(), 'data/generated/modules');

interface VideoBlock {
  type: 'video';
  content: {
    url: string;
    title: string;
    duration?: number;
  };
}

interface TextBlock {
  type: 'text';
  content: {
    text: string;
  };
}

type Block = VideoBlock | TextBlock | Record<string, unknown>;

interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

interface Module {
  slug: string;
  type: string;
  title: string;
  description?: string;
  role_slug?: string;
  is_premium: boolean;
  display_order: number;
  sections: Section[];
}

// Video placeholders for universal module
const UNIVERSAL_VIDEOS: VideoBlock[] = [
  {
    type: 'video',
    content: {
      url: 'placeholder://video/intro/interview-fundamentals',
      title: 'Introduction: What Makes Great Interview Preparation',
      duration: 180, // 3 min
    }
  },
  {
    type: 'video',
    content: {
      url: 'placeholder://video/technique/star-method-demo',
      title: 'The STAR Method: A Complete Walkthrough',
      duration: 300, // 5 min
    }
  },
  {
    type: 'video',
    content: {
      url: 'placeholder://video/example/behavioral-answer-example',
      title: 'Example: A Strong Behavioral Answer',
      duration: 240, // 4 min
    }
  }
];

// Role-specific video placeholders (keyed by role slug)
const ROLE_VIDEOS: Record<string, VideoBlock[]> = {
  'software-engineer': [
    {
      type: 'video',
      content: {
        url: 'placeholder://video/intro/software-engineer-interviews',
        title: 'Introduction: The Software Engineer Interview Loop',
        duration: 240,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/technique/coding-interview-approach',
        title: 'Technique: How to Approach Coding Problems',
        duration: 360,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/example/system-design-walkthrough',
        title: 'Example: System Design Question Walkthrough',
        duration: 600,
      }
    }
  ],
  'product-manager': [
    {
      type: 'video',
      content: {
        url: 'placeholder://video/intro/product-manager-interviews',
        title: 'Introduction: The PM Interview Process',
        duration: 240,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/technique/product-sense-framework',
        title: 'Technique: Product Sense Question Framework',
        duration: 420,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/example/product-design-walkthrough',
        title: 'Example: Product Design Question Walkthrough',
        duration: 480,
      }
    }
  ],
  'data-scientist': [
    {
      type: 'video',
      content: {
        url: 'placeholder://video/intro/data-scientist-interviews',
        title: 'Introduction: The Data Science Interview Loop',
        duration: 240,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/technique/ml-case-study-approach',
        title: 'Technique: Structuring ML Case Studies',
        duration: 420,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/example/a-b-test-analysis',
        title: 'Example: A/B Test Analysis Walkthrough',
        duration: 360,
      }
    }
  ],
  'engineering-manager': [
    {
      type: 'video',
      content: {
        url: 'placeholder://video/intro/engineering-manager-interviews',
        title: 'Introduction: The Engineering Manager Interview',
        duration: 240,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/technique/leadership-scenarios',
        title: 'Technique: Navigating Leadership Scenarios',
        duration: 420,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/example/conflict-resolution-answer',
        title: 'Example: Team Conflict Resolution Answer',
        duration: 360,
      }
    }
  ],
  'frontend-engineer': [
    {
      type: 'video',
      content: {
        url: 'placeholder://video/intro/frontend-engineer-interviews',
        title: 'Introduction: The Frontend Interview Process',
        duration: 240,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/technique/ui-coding-approach',
        title: 'Technique: UI Coding Interview Approach',
        duration: 360,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/example/react-component-walkthrough',
        title: 'Example: Building a React Component Live',
        duration: 480,
      }
    }
  ],
  'backend-engineer': [
    {
      type: 'video',
      content: {
        url: 'placeholder://video/intro/backend-engineer-interviews',
        title: 'Introduction: The Backend Interview Loop',
        duration: 240,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/technique/api-design-principles',
        title: 'Technique: API Design Interview Approach',
        duration: 360,
      }
    },
    {
      type: 'video',
      content: {
        url: 'placeholder://video/example/database-design-walkthrough',
        title: 'Example: Database Design Question Walkthrough',
        duration: 420,
      }
    }
  ],
};

// Default video set for roles without specific content
const DEFAULT_ROLE_VIDEOS = (roleSlug: string, roleTitle: string): VideoBlock[] => [
  {
    type: 'video',
    content: {
      url: `placeholder://video/intro/${roleSlug}-interviews`,
      title: `Introduction: The ${roleTitle} Interview Process`,
      duration: 240,
    }
  },
  {
    type: 'video',
    content: {
      url: `placeholder://video/technique/${roleSlug}-approach`,
      title: `Technique: Preparing for ${roleTitle} Interviews`,
      duration: 360,
    }
  },
  {
    type: 'video',
    content: {
      url: `placeholder://video/example/${roleSlug}-answer-example`,
      title: `Example: A Strong ${roleTitle} Interview Answer`,
      duration: 300,
    }
  }
];

function addVideosToUniversalModule(module: Module): Module {
  // Check if videos already exist
  const hasVideos = module.sections.some(s =>
    s.blocks.some(b => b.type === 'video')
  );
  if (hasVideos) {
    console.log(`  Skipping ${module.slug} - already has video blocks`);
    return module;
  }

  // Create a new video section at the beginning
  const videoSection: Section = {
    id: 'video-intro',
    title: 'Video Lessons',
    blocks: [
      {
        type: 'text',
        content: {
          text: 'Watch these short videos to build a strong foundation for your interview preparation.'
        }
      } as TextBlock,
      ...UNIVERSAL_VIDEOS
    ]
  };

  return {
    ...module,
    sections: [videoSection, ...module.sections]
  };
}

function addVideosToRoleModule(module: Module): Module {
  // Check if videos already exist
  const hasVideos = module.sections.some(s =>
    s.blocks.some(b => b.type === 'video')
  );
  if (hasVideos) {
    console.log(`  Skipping ${module.slug} - already has video blocks`);
    return module;
  }

  const roleSlug = module.role_slug || module.slug.replace('role-', '');
  const roleTitle = module.title.replace(' Interview Guide', '');

  // Get role-specific videos or default
  const videos = ROLE_VIDEOS[roleSlug] || DEFAULT_ROLE_VIDEOS(roleSlug, roleTitle);

  // Create a new video section at the beginning
  const videoSection: Section = {
    id: 'video-intro',
    title: 'Video Lessons',
    blocks: [
      {
        type: 'text',
        content: {
          text: `These videos cover key techniques and real examples to help you prepare for ${roleTitle} interviews.`
        }
      } as TextBlock,
      ...videos
    ]
  };

  return {
    ...module,
    sections: [videoSection, ...module.sections]
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('DRY RUN - No files will be modified\n');
  }

  let universalCount = 0;
  let roleCount = 0;

  // Process universal module
  const universalPath = path.join(MODULES_DIR, 'universal-fundamentals.json');
  if (fs.existsSync(universalPath)) {
    console.log('Processing universal module...');
    const content = fs.readFileSync(universalPath, 'utf-8');
    const module = JSON.parse(content) as Module;
    const updated = addVideosToUniversalModule(module);

    if (!dryRun) {
      fs.writeFileSync(universalPath, JSON.stringify(updated, null, 2) + '\n');
    }

    if (updated !== module) {
      universalCount++;
      console.log(`  Added ${UNIVERSAL_VIDEOS.length} videos to ${module.slug}`);
    }
  }

  // Process role modules
  console.log('\nProcessing role modules...');
  const files = fs.readdirSync(MODULES_DIR).filter(f => f.startsWith('role-') && f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(MODULES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const module = JSON.parse(content) as Module;
    const updated = addVideosToRoleModule(module);

    if (!dryRun) {
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
    }

    if (updated !== module) {
      roleCount++;
      const videoCount = updated.sections[0]?.blocks.filter(b => b.type === 'video').length || 0;
      console.log(`  Added ${videoCount} videos to ${module.slug}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Universal modules updated: ${universalCount}`);
  console.log(`Role modules updated: ${roleCount}`);
  console.log(`Total modules updated: ${universalCount + roleCount}`);

  if (dryRun) {
    console.log('\nDRY RUN - No files were modified. Remove --dry-run to apply changes.');
  }
}

main().catch(console.error);
