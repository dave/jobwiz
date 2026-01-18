# Project Build - Activity Log

## Current Status
**Last Updated:** 2026-01-18
**Tasks Completed:** 27
**Stage 1:** COMPLETE (All 4 issues closed)
**Stage 2:** COMPLETE (All 4 issues closed: #7, #8, #9, #10)
**Stage 3:** COMPLETE (All 3 issues closed: #4, #5, #19)
**Stage 4:** IN PROGRESS (Issues closed: #14, #11, #12, #13, #26, #27, #28, #29, #15)
**Current Task:** None

---

## Session Log

### 2026-01-17 - Issue #3: Repo Setup, CI/CD, Hosting

**Completed:**
- Set up Next.js 14.2.28 with App Router and TypeScript (strict mode)
- Configured Tailwind CSS with PostCSS
- Created required directory structure:
  - `src/app/` with layout.tsx, page.tsx
  - `src/app/[company]/page.tsx` - dynamic company route
  - `src/app/[company]/[role]/page.tsx` - dynamic company+role route
  - `src/app/api/health/route.ts` - health check endpoint
  - `src/components/ui/` - placeholder for UI components
  - `src/lib/supabase/` - stub client/server files for #55
  - `src/lib/utils.ts` - utility functions
  - `src/types/index.ts` - type definitions
- Configured TypeScript with `strict: true`, `noUncheckedIndexedAccess: true`, and `@/*` path alias
- Set up ESLint with Next.js core-web-vitals
- Created CI/CD workflow (.github/workflows/ci.yml) for lint, type-check, build
- Added Jest configuration for future tests

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- Health endpoint returns `{"status":"ok","timestamp":"..."}`
- All routes return 200 status codes
- Company and role slugs display correctly on dynamic pages

**Screenshots:**
- `screenshots/repo-setup-home.png` - Home page
- `screenshots/repo-setup-company-role.png` - Company/role dynamic page

### 2026-01-17 - Issue #6: Module Schema + Position Matrix

**Completed:**
- Created type definitions for module system:
  - `src/types/module.ts` - ModuleType, ContentBlockType enums; Module, ContentBlock interfaces with discriminated union
  - `src/types/position.ts` - Industry, RoleCategory enums; Company, Role, Position interfaces
  - `src/types/index.ts` - Re-exports all types
- Implemented matrix functions:
  - `src/lib/modules/matrix.ts` - getModulesForPosition(), splitByAccess(), ModuleRegistry interface
  - Returns modules in strict order: universal → industry → role → company → company-role
  - Sorts by order field within each type group
- Created 4 sample module JSON files:
  - `universal-interview-basics.json` - General interview prep (free)
  - `industry-tech.json` - Tech industry insights (free)
  - `role-software-engineer.json` - SWE prep guide (premium)
  - `company-google.json` - Google-specific prep (premium)
- Added ts-node dependency for Jest TypeScript config

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 25 tests pass (matrix.test.ts + samples.test.ts)
- All sample JSON files valid and conform to Module type
- Matrix functions correctly filter and order modules by position

### 2026-01-17 - Issue #47: Journey Config Schema

**Completed:**
- Enhanced journey type definitions:
  - Added `JourneyStepType` type (`content`, `video`, `audio`, `quiz`, `checklist`)
  - Added `type` field to `JourneyStep` interface
  - Updated `src/types/index.ts` to export new type
- Created journey config loader:
  - `src/lib/journey/config.ts` - main loader with validation
  - `src/lib/journey/index.ts` - re-exports
  - Functions: `loadJourneyConfig`, `parseJourneyConfig`, `validateJourneyConfig`
  - Utility functions: `calculateJourneyDuration`, `countRequiredSteps`, `splitStepsByPaywall`
  - Custom errors: `JourneyConfigNotFoundError`, `JourneyConfigValidationError`
- Created sample journey config:
  - `src/lib/journey/samples/google-swe.json` - Google SWE journey with 6 steps, paywall at step 3
- Fixed JourneyContext type error (undefined step handling)

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 154 tests pass (added 30 journey config tests)
- Sample config validates and loads correctly

**Screenshots:**
- `screenshots/journey-config-schema.png` - Demo page showing journey components

### 2026-01-17 - Issue #55: Supabase Project Setup

**Status:** Closed (code implementation was already complete)

**Previously Completed (commit `da6c5c8`):**
- Implemented browser client: `src/lib/supabase/client.ts`
- Implemented server client: `src/lib/supabase/server.ts`
- Created `.env.example` with required Supabase environment variables
- Added connection tests: `src/lib/supabase/__tests__/connection.test.ts`
- Installed `@supabase/ssr` and `@supabase/supabase-js` packages

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 192 tests pass (2 todo tests for server context)
- Connection tests verify client initialization

**Note:** Manual dashboard configuration (creating Supabase projects, enabling auth providers, setting real credentials) is outside the scope of code automation.

---

## Stage 2 Progress

### 2026-01-17 - Issue #45: Journey State Management

**Completed:**
- Added Supabase sync for logged-in users to existing JourneyContext:
  - `src/lib/journey/supabase-sync.ts` - new file with sync functions:
    - `loadFromSupabase()` - loads journey progress from Supabase
    - `saveToSupabase()` - saves journey progress to Supabase
    - `JourneyProgressRow` type for Supabase table schema
  - Updated `src/components/journey/JourneyContext.tsx`:
    - Added `enableSupabaseSync` prop (default: true)
    - Load from Supabase on mount (if remote state is newer)
    - Save to Supabase on state changes (debounced 1 second)
  - Updated `src/lib/journey/index.ts` - exports new sync functions
- All other acceptance criteria were already implemented:
  - `JourneyProvider` context component
  - `useJourney()` hook returns: currentStepIndex, completedSteps, answers, progress
  - Actions: goToStep(), nextStep(), prevStep(), markComplete(), setAnswer()
  - State persists to localStorage (key: `journey-{journeyId}`)

**Tests Added:**
- `src/lib/journey/__tests__/supabase-sync.test.ts` - 10 tests for sync functions
- Added 3 Supabase integration tests to JourneyContext.test.tsx

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 205 tests pass (added 13 new tests)

**Screenshot:**
- `screenshots/journey-state-management.png` - Demo page

### 2026-01-17 - Issue #46: Step Navigation Logic

**Completed:**
- Verified existing `StepNavigation` component at `src/components/journey/StepNavigation.tsx`
- All acceptance criteria already implemented:
  - Next button advances to next step via `nextStep()`
  - Back button returns to previous step via `prevStep()`
  - First step: back button hidden (`!isFirstStep` condition)
  - Last step: shows "Complete" instead of "Continue" (`isLastStep` condition)
  - Required steps block advancement (`canAdvance` checks `currentStep.required`)
  - Keyboard navigation: Enter = next, Escape = back
- Created comprehensive test suite: `src/components/journey/__tests__/StepNavigation.test.tsx`
- Added journey demo page: `src/app/journey-demo/page.tsx`

**Tests Added:**
- 22 new tests for StepNavigation component covering:
  - Next/back button callbacks and navigation
  - Back hidden on first step
  - Complete button on last step
  - Disabled state when required step incomplete
  - Keyboard navigation (Enter/Escape)
  - Accessibility (aria-labels, touch targets)

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 229 tests pass (added 22 new tests)

**Screenshots:**
- `screenshots/46-step-navigation-first.png` - First step, back button hidden
- `screenshots/46-step-navigation-second-disabled.png` - Required step, continue disabled
- `screenshots/46-step-navigation-last-complete.png` - Last step with Complete button

### 2026-01-18 - Issue #48: Journey Mobile Responsive Layout

**Completed:**
- Enhanced `JourneyContainer` with responsive layouts:
  - Mobile (<640px): full-screen steps, bottom navigation
  - Tablet (640-1024px): similar to mobile layout
  - Desktop (>1024px): sidebar with Timeline component
  - Added `showSidebar` prop (default: true)
- Added Tailwind animations:
  - `slideInRight` and `slideInLeft` for directional transitions
  - Explicit screen breakpoints (sm, md, lg, xl)
- Added reduced motion support:
  - CSS `prefers-reduced-motion` media query in globals.css
  - `motion-safe:` prefix on animation classes
  - `safe-area-inset-bottom` support for notched devices
- Created comprehensive test suite: `src/components/journey/__tests__/JourneyContainer.test.tsx`

**Tests Added:**
- 22 new tests for JourneyContainer covering:
  - Rendering (header, progress bar, navigation, children)
  - Sidebar behavior (show/hide, timeline in sidebar)
  - Accessibility (aria-labels, roles, aria-current)
  - Touch targets (44px minimum verified)
  - Responsive classes (flex direction, padding, hidden states)
  - Animations (motion-safe classes)
  - onComplete callback

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 251 tests pass (added 22 new tests)

**Screenshots:**
- `screenshots/48-responsive-desktop.png` - Desktop with sidebar timeline
- `screenshots/48-responsive-tablet.png` - Tablet layout (similar to mobile)
- `screenshots/48-responsive-mobile.png` - Mobile full-screen layout

### 2026-01-18 - Issue #9: Timeline/Progress Visualization

**Completed:**
- Added horizontal orientation option to Timeline component
- Changed Timeline list markup from `<ol>` to `<ul>` for semantic HTML
- Created comprehensive test suite for Timeline (31 tests)
- Created comprehensive test suite for ProgressBar (18 tests)
- Closed Issue #7 (all 4 sub-issues complete)

**Timeline Component Features:**
- Displays all steps with titles
- Step states: completed (✓ checkmark), current (blue highlight), upcoming (number), locked (🔒)
- Estimated time per step (optional)
- Vertical (default) and horizontal orientation
- Interactive click navigation (completed/upcoming steps)
- Locked steps disabled
- Touch targets ≥44px
- `aria-current="step"` on current step
- Keyboard navigable with focus rings

**ProgressBar Component Features:**
- Shows overall percentage complete
- Displays "X of Y steps complete" text
- Smooth animation on progress change (transition-all duration-300)
- Proper ARIA attributes (valuenow, valuemin, valuemax, aria-label)

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 300 tests pass (298 passed, 2 todo)

**Screenshots:**
- `screenshots/9-timeline-desktop.png` - Desktop with sidebar timeline
- `screenshots/9-timeline-step2-progress.png` - Step 2 with checklist progress

### 2026-01-17 - Issue #8: Content Block Component Library

**Status:** Closed (code implementation was already complete)

**Previously Implemented Components:**
- `VideoBlock` - YouTube/Vimeo embeds with onComplete at 80%
- `AudioBlock` - Play/pause, seek, speed control (0.5x-2x), onComplete at 90%
- `TextBlock` - paragraph, header, quote, tip, warning with markdown support
- `InfographicBlock` - Images with zoom modal
- `AnimationBlock` - Lottie animations with reduced motion support
- `QuizBlock` - Multiple choice with correct/incorrect feedback
- `ChecklistBlock` - Persistent checkboxes with progress indicator
- `BlockRenderer` - Dispatcher for all block types

**Sub-issues Closed:**
- #49 - Video player component
- #50 - Audio player component
- #51 - Text and quote blocks
- #52 - Infographic and animation components
- #53 - Multiple choice question component
- #54 - Checkbox/checklist component

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 300 tests pass (101 block component tests)
- All acceptance criteria verified

### 2026-01-17 - Issue #10: Paywall Gate Component

**Completed:**
- Created `PaywallGate` component with AB testing variants:
  - `src/components/paywall/PaywallGate.tsx` - main component
  - `src/components/paywall/unlock-state.ts` - localStorage persistence
  - `src/components/paywall/index.ts` - exports

**PaywallGate Component Features:**
- Gate variants: hard (complete block), soft (blurred preview), teaser (partial content)
- Configurable price with currency formatting
- Custom heading, description, and CTA text
- Mock mode for development (no Stripe required)
- Real purchase mode with async `onPurchase` callback
- Analytics tracking: impressions, CTA clicks, unlock events via `onTrack`
- Unlock state persists to localStorage per journey ID
- Loading state during purchase flow
- Accessible: dialog role, labeled heading, descriptive button labels

**Demo Page:**
- `src/app/paywall-demo/page.tsx` - interactive demo with variant switcher

**Tests Added:**
- `src/components/paywall/__tests__/PaywallGate.test.tsx` - 35 tests covering:
  - Rendering (gate with CTA, price, custom text)
  - Variants (hard, soft, teaser)
  - Mock mode (unlock flow, localStorage persistence)
  - Real purchase mode (onPurchase callback)
  - Analytics tracking (impressions, CTA clicks, unlock events)
  - Persistence (localStorage check on mount)
  - Accessibility (button labels, dialog role, heading)
  - unlock-state utility functions

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 335 tests pass (333 passed, 2 todo)
- All acceptance criteria verified

---

## Stage 2 Complete

All Stage 2 (Content Framework) issues are now closed:
- #7 - Build step-based journey UI framework
- #8 - Build content block component library
- #9 - Build timeline/progress visualization
- #10 - Build configurable paywall gate component

---

## Stage 3 Progress

### 2026-01-18 - Issue #4: Build scraper for Glassdoor/Reddit interview data

**Completed:**
- Created `scripts/scrapers/` directory structure with Python scraper package
- Implemented Reddit scraper using PRAW (Python Reddit API Wrapper):
  - Searches r/cscareerquestions, r/jobs, r/interviews for interview posts
  - Extracts post title, body, top comments, metadata
  - Uses official Reddit OAuth API
- Implemented Glassdoor scraper with graceful block handling:
  - Searches for employer by company name
  - Extracts interview reviews with questions, difficulty, outcome
  - Detects and handles anti-bot blocking (403, captcha, rate limits)
  - Returns empty results gracefully when blocked
- Created exponential backoff utility (1s → 2s → 4s → 8s, max 60s)
- Created Supabase storage layer with deduplication:
  - `source_id` unique constraint prevents duplicate inserts
  - `ON CONFLICT DO NOTHING` via upsert with ignore_duplicates=True
  - Logs new vs. skipped duplicate counts
- Created CLI script `scrape.py` with options:
  - `--source=reddit|glassdoor|all`
  - `--company=<name>`
  - `--limit=<n>` (default 25)
  - `--dry-run` (fetch without storing)
- Created Supabase migration for tables:
  - `scraped_reddit` - Reddit posts with source_id unique constraint
  - `scraped_glassdoor` - Glassdoor reviews with source_id unique constraint
  - `scrape_runs` - Job metadata with new/duplicate counts

**Files Created:**
- `scripts/scrapers/requirements.txt` - Python dependencies
- `scripts/scrapers/scrape.py` - Main CLI script
- `scripts/scrapers/pytest.ini` - Test configuration
- `scripts/scrapers/scrapers/__init__.py` - Package exports
- `scripts/scrapers/scrapers/backoff.py` - Exponential backoff utility
- `scripts/scrapers/scrapers/storage.py` - Supabase storage with deduplication
- `scripts/scrapers/scrapers/reddit.py` - Reddit scraper using PRAW
- `scripts/scrapers/scrapers/glassdoor.py` - Glassdoor scraper with block detection
- `scripts/scrapers/tests/test_backoff.py` - 8 backoff tests
- `scripts/scrapers/tests/test_reddit.py` - 10 Reddit scraper tests
- `scripts/scrapers/tests/test_glassdoor.py` - 11 Glassdoor scraper tests
- `scripts/scrapers/tests/test_storage.py` - 12 storage/deduplication tests
- `supabase/migrations/20260117000001_create_scraper_tables.sql` - DB schema

**Tests:**
- 41 unit tests (all mocked, no external calls)
- All tests pass

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 333 passed, 2 todo
- Python tests: 41 passed
- Site health check returns OK

**Screenshot:**
- `screenshots/4-scraper-demo-page.png` - Site still working after changes

### 2026-01-18 - Issue #19: Generate company trivia content

**Completed:**
- Created `scripts/trivia/` directory structure with Python trivia package
- Implemented Wikipedia fetcher for company facts:
  - Searches Wikipedia API for company pages
  - Parses infobox data for founding date, founders, HQ, industry, products, CEO
  - Cleans wiki markup, extracts structured data
- Implemented Google News RSS fetcher:
  - Fetches recent news for company
  - Extracts title, link, source, publication date
  - Specialized methods for acquisition and executive news
- Implemented AI quiz generator using OpenAI:
  - Generates quiz, flashcard, and factoid formats
  - Creates multiple choice with 3 plausible wrong options
  - Uses structured prompts for quality distractors
  - Mock mode for testing without API calls
- Implemented Supabase storage layer:
  - Stores trivia items with deduplication via unique question constraint
  - Logs generation runs with metrics
  - Retrieval methods by company and format
- Created CLI script `generate.py` with options:
  - `--company=<slug>` (required)
  - `--limit=<n>` (default 15)
  - `--dry-run` (generate without storing)
  - `--mock` (use mock generator, no OpenAI calls)
- Created Supabase migration for `company_trivia` table

**Files Created:**
- `scripts/trivia/requirements.txt` - Python dependencies
- `scripts/trivia/generate.py` - Main CLI script
- `scripts/trivia/pytest.ini` - Test configuration
- `scripts/trivia/trivia/__init__.py` - Package exports
- `scripts/trivia/trivia/wikipedia.py` - Wikipedia API fetcher
- `scripts/trivia/trivia/news.py` - Google News RSS fetcher
- `scripts/trivia/trivia/generator.py` - AI quiz generator
- `scripts/trivia/trivia/storage.py` - Supabase storage layer
- `scripts/trivia/tests/test_wikipedia.py` - 12 Wikipedia fetcher tests
- `scripts/trivia/tests/test_news.py` - 12 news fetcher tests
- `scripts/trivia/tests/test_generator.py` - 19 generator tests
- `scripts/trivia/tests/test_storage.py` - 14 storage tests
- `supabase/migrations/20260118000001_create_company_trivia_table.sql` - DB schema

**Tests:**
- 57 unit tests (all mocked, no external calls)
- All tests pass

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 333 passed, 2 todo
- Python tests: 57 passed
- Site health check returns OK

**Screenshot:**
- `screenshots/19-trivia-site-working.png` - Site still working after changes

---

## Stage 3 Complete

All Stage 3 (Data Collection) issues are now closed:
- #4 - Build scraper for Reddit interview data
- #5 - Google Trends API for search volume by company/role
- #19 - Generate company trivia content

---

## Stage 4 Progress

### 2026-01-18 - Issue #14: AI-assisted module structure design

**Completed:**
- Created module template structure documents in `templates/` directory:
  - `templates/universal-module.md` - Universal interview prep (8 sections)
  - `templates/company-module.md` - Company-specific prep (8 sections)
  - `templates/role-module.md` - Role-specific prep (8 sections)
  - `templates/combined-module.md` - Company+role specific prep (9 sections)
- Created machine-readable JSON versions in `templates/json/`:
  - Each template defines: sections, blockTypes, required/optional, word counts, examples
  - All templates conform to ContentBlockType enum from #6
- Created validation script `scripts/validate-template.ts`:
  - Zod schema validation for templates
  - Validates section structure, block types, word count ranges
  - CLI: `npm run validate-template -- --all`
- Added zod as dev dependency for schema validation
- Created comprehensive test suite (45 tests)

**Template Structure per Module:**
- Section headings with order
- Content block types per section (text, video, quiz, etc.)
- Required vs optional sections
- Estimated word count per section (100-2000 range)
- Example content snippets

**Files Created:**
- `templates/universal-module.md` - Universal interview prep template
- `templates/company-module.md` - Company module template
- `templates/role-module.md` - Role module template
- `templates/combined-module.md` - Combined (company+role) template
- `templates/json/*.json` - Machine-readable JSON versions
- `scripts/validate-template.ts` - Validation script with zod
- `scripts/__tests__/validate-template.test.ts` - 45 template tests

**Tests:**
- 45 template validation tests covering:
  - Schema validation (sections, block types, word counts)
  - Template file existence and parsing
  - Valid ContentBlockTypes from #6
  - At least one required section per template
  - Consistent structure across templates

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 378 passed, 2 todo (45 new tests)
- `npm run validate-template -- --all` - all 4 templates valid

### 2026-01-18 - Issue #11: Prompts for company module generation

**Completed:**
- Created 4 company prompt templates in `prompts/company/`:
  - `company-culture-prompt.md` - Culture & values section generation
  - `company-interview-stages-prompt.md` - Interview process section generation
  - `company-tips-prompt.md` - Insider tips and red flags sections
  - `company-trivia-prompt.md` - Company trivia and quiz generation
- Created shared validation library `src/lib/prompts/validation.ts`:
  - Zod schemas for all prompt output types
  - AI-phrase detection (warns on "In conclusion...", etc.)
  - Unique ID validation
  - Quiz answer validation (exactly 1 correct)
- Created CLI scripts:
  - `scripts/prompts/validate-prompt.ts` - Validates prompt output JSON
  - `scripts/prompts/generate-module.ts` - Generates company modules
- Added npm scripts: `validate-prompt`, `generate-module`
- Generated sample outputs for 2 companies:
  - `output/company-google-preview.json`
  - `output/company-amazon-preview.json`

**Prompt Template Features:**
- Input format for Glassdoor/Reddit scraped data
- Output schema matching Module type from #6
- Handling for missing/sparse data
- Anti-patterns list (AI phrases to avoid)
- Example outputs for each prompt
- Word count targets per section

**Tests Added:**
- 36 new tests covering:
  - Schema validation for all prompt types
  - Duplicate ID detection
  - Quiz correct answer validation
  - AI-phrase detection
  - Company module generation
  - Content quality checks

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 414 passed, 2 todo (36 new tests)
- `npm run generate-module -- --type=company --company=google --dry-run` - works
- Sample outputs valid JSON matching Module schema

### 2026-01-18 - Issue #12: Design prompts for marketing landing page copy

**Completed:**
- Created 4 landing page prompt templates in `prompts/landing/`:
  - `landing-headline-prompt.md` - Headline/subheadline generation with AB test variations
  - `landing-bullets-prompt.md` - Value proposition bullets (what you'll learn, what's included)
  - `landing-cta-prompt.md` - CTA button text and supporting copy variations
  - `landing-meta-prompt.md` - SEO meta title, description, and OG tags
- Created validation library `src/lib/prompts/landing-validation.ts`:
  - Zod schemas for all landing copy output types
  - Validates headline angles (insider, transformation, fear, authority, specificity)
  - Validates urgency types (none, time, value, social)
  - Validates icon suggestions for bullets
  - Character/word count validation for meta and headlines
  - Company/role mention checking
- Created CLI script `scripts/prompts/generate-landing.ts`:
  - Usage: `npm run generate-landing -- --company=google --role=pm --dry-run`
  - Mock generators for all landing copy components
  - Supports 3 companies (Google, Amazon, Meta) × 2 roles (PM, SWE)
- Generated sample outputs for 3 company/role combos:
  - `output/landing-google-pm-preview.json`
  - `output/landing-amazon-swe-preview.json`
  - `output/landing-meta-pm-preview.json`

**Prompt Template Features:**
- Headlines: 5 variations with different angles for AB testing
- Bullets: 4 learn bullets (what you'll get) + 4 included bullets (what's in the package)
- CTAs: 3 primary CTA variations + 2 secondary CTA variations
- Meta: SEO-optimized title (<60 chars), description (<160 chars), OG tags, 7 keywords

**Tests Added:**
- 63 new tests covering:
  - Schema validation for all landing copy types
  - Output generation and structure validation
  - Word/character count constraints
  - Angle and urgency type validation
  - Duplicate ID detection
  - Company/role specific content verification

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 477 passed, 2 todo (63 new tests)
- `npm run generate-landing -- --company=google --role=pm --dry-run` - works
- Sample outputs valid JSON with 5 headlines, 8 bullets, 5 CTAs, SEO meta

### 2026-01-18 - Issue #13: Prompts for interview Q&A with psychology explanations

**Completed:**
- Created 4 Q&A prompt templates in `prompts/qa/`:
  - `qa-behavioral-prompt.md` - Behavioral/STAR questions with leadership lens
  - `qa-technical-prompt.md` - Role-specific technical questions
  - `qa-culture-prompt.md` - Culture fit and values-based questions
  - `qa-curveball-prompt.md` - Estimation, pressure, and creative questions
- Created Q&A validation library `src/lib/prompts/qa-validation.ts`:
  - Zod schemas for all 4 Q&A categories
  - ID format validation (beh-, tech-, cult-, curve- prefixes)
  - Interviewer intent length validation (50-500 chars)
  - Answer framework structure validation
  - Psychology depth checking
  - AI phrase detection
- Created CLI script `scripts/prompts/generate-qa.ts`:
  - Usage: `npm run generate-qa -- --company=google --role=swe --type=behavioral --dry-run`
  - Supports all, behavioral, technical, culture, curveball types
  - Mock generators for Google, Amazon, Meta companies
  - Mock generators for SWE, PM, DS roles
- Generated sample outputs for 2 company/role combos:
  - `output/qa-google-swe-all.json`
  - `output/qa-amazon-pm-all.json`

**Q&A Output Structure Per Question:**
- `question` - The interview question
- `interviewer_intent` - 50-100 word psychology explanation
- `good_answer_demonstrates` - 3-5 competencies
- `common_mistakes` - 3-4 mistakes to avoid
- `answer_framework` - Structure/approach (not scripted answers)
- `difficulty` - easy/medium/hard
- `tags` - Topic categorization

**Tests Added:**
- 30 new tests covering:
  - Schema validation for all Q&A categories
  - ID format enforcement
  - Interviewer intent length requirements
  - Answer framework structure validation
  - Duplicate ID detection
  - AI phrase warnings
  - Quality check functions (checkTeachesThinking, checkRoleSpecific)

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 507 passed, 2 todo (30 new tests)
- `npm run generate-qa -- --company=google --role=swe --type=behavioral --dry-run` - works
- Sample outputs contain deep psychology explanations, answer frameworks (not scripts)

### 2026-01-18 - Issue #26: Repetition detection automation

**Completed:**
- Created `scripts/quality/` directory for quality control scripts
- Implemented repetition detection script `scripts/quality/check-repetition.ts`:
  - Analyzes text content for repeated phrases (n-grams)
  - Detects repetition within single modules and across multiple modules
  - Configurable threshold (default: 3+ occurrences = flag)
  - Returns list of repeated phrases with counts and locations
  - Returns pass/fail status with exit codes (0=pass, 1=fail)
- Added AI-sounding phrase detection:
  - Flags 30+ common AI phrases ("in conclusion", "let's dive in", etc.)
  - Handles smart quotes and various apostrophe characters
  - Can be disabled via config
- Created sample test files:
  - `scripts/quality/samples/with-repetition.json` - module with AI phrases and repeated content
  - `scripts/quality/samples/clean.json` - module with clean content
- Added npm script: `npm run check-repetition`
- Exports `analyzeRepetition()` function for programmatic use

**Features:**
- Configurable phrase length (min/max words, default 3-8)
- Common word filtering (ignores "the", "and", "or", etc.)
- Location tracking (module, section, block)
- Graceful handling of non-module JSON files
- Detailed CLI output with pass/fail summary

**Tests Added:**
- 31 tests covering:
  - Phrase detection and counting
  - Common word filtering
  - AI phrase detection (10+ specific phrases tested)
  - Location tracking
  - Threshold configuration
  - Edge cases (empty modules, special characters, mixed case)
  - Phrase length configuration

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 538 passed, 2 todo (31 new tests)
- `npm run check-repetition -- --input=samples/with-repetition.json` - fails with detailed output
- `npm run check-repetition -- --input=samples/clean.json` - passes

### 2026-01-18 - Issue #27: Readability scoring system

**Completed:**
- Created readability scoring script `scripts/quality/check-readability.ts`:
  - Implements Flesch-Kincaid Reading Ease formula
  - Score range: 0-100 (higher = easier to read)
  - Target range: 60-70 (8th-9th grade level)
- Configurable thresholds:
  - Default: fail if score below 50 (too complex) or above 80 (too simple)
  - CLI flags: `--min=<n>` and `--max=<n>`
- Per-section breakdown:
  - Optional `--per-section` flag for detailed analysis
  - Reports status per section (pass/too_complex/too_simple)
- Utility functions exported for programmatic use:
  - `countSyllables()` - syllable counting with silent-e handling
  - `countSentences()` - sentence detection
  - `countWords()` - word counting
  - `calculateFleschKincaid()` - core formula
  - `analyzeReadability()` - full analysis function
- Created sample test files:
  - `samples/good-readability.json` - balanced content (score ~78, PASS)
  - `samples/complex.json` - academic language (score 0, FAIL - too complex)
  - `samples/simple.json` - very simple language (score 100, FAIL - too simple)
- Added npm script: `npm run check-readability`

**Tests Added:**
- 38 tests covering:
  - Syllable counting (single, multi-syllable, silent-e, edge cases)
  - Sentence counting (single, multiple, no punctuation)
  - Word counting
  - Flesch-Kincaid calculation (simple, complex, clamping)
  - Full analysis (pass/fail, thresholds, per-section, block types)
  - Integration with sample files

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 576 passed, 2 todo (38 new tests)
- `npm run check-readability -- --input=samples/good-readability.json` - Exit 0 (PASS, score 78.5)
- `npm run check-readability -- --input=samples/complex.json` - Exit 1 (FAIL - too complex)
- `npm run check-readability -- --input=samples/simple.json` - Exit 1 (FAIL - too simple)

### 2026-01-18 - Issue #28: Company fact verification checklist

**Completed:**
- Created fact verification script `scripts/quality/check-facts.ts`:
  - Extracts factual claims about companies from content
  - Identifies fact types: founding year, founders, HQ, employee count, mission, CEO, interview process, culture claims, products, acquisitions, revenue
  - Handles markdown formatting (e.g., `**CEO:**` bold format)
  - Tracks fact location (module, section, block)
  - Generates markdown checklist with verification sources
  - Calculates confidence score based on verifiability
  - Supports deduplication across blocks
- Created CLI script: `npm run check-facts -- --input=file.json`
- Created sample test files:
  - `scripts/quality/samples/with-facts.json` - module with many facts
  - `scripts/quality/samples/minimal-facts.json` - module with minimal facts
- Generated sample output: `output/facts-checklist-google.md`

**Fact Types Supported:**
- Founding Year - extracted from "founded in YYYY" patterns
- Founders - extracted from "by Name and Name" patterns
- Headquarters - extracted from "headquartered in City" patterns
- Employee Count - extracted from "X,XXX employees" patterns
- Mission - extracted from quoted mission statements
- CEO - extracted from "CEO: Name" or "CEO is Name" patterns
- Interview Process - extracted from round counts and timeline mentions
- Culture Claims - extracted from "values X" or "looks for Y" patterns
- Products - extracted from product listings
- Acquisitions - extracted from acquisition mentions
- Revenue - extracted from revenue figures

**Tests Added:**
- 38 new tests covering:
  - Fact extraction for all types
  - Location tracking
  - Verification source suggestions
  - Confidence score calculation
  - Markdown checklist generation
  - Content block type handling (text, tip, header, quiz, checklist)
  - Edge cases (empty modules, special characters, numeric variations)
  - Real sample file validation

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 614 passed, 2 todo (38 new tests)
- `npm run check-facts -- --input=output/company-google-preview.json` - extracts 8 facts with 95% confidence

### 2026-01-18 - Issue #29: Human review sampling workflow

**Completed:**
- Created review checklist document `docs/review-checklist.md`:
  - Tone & Voice criteria
  - Accuracy verification
  - Specificity checks
  - Structure & Flow review
  - Psychology & Depth evaluation
  - Pass/fail criteria defined
  - Flagging format documented
- Implemented sampling strategy with prioritization:
  - Configurable percentage (default 10%)
  - High priority: flagged content (AI phrases, readability issues)
  - Medium priority: new companies (not previously reviewed)
  - Low priority: random sample
- Created CLI script `scripts/quality/sample-for-review.ts`:
  - Usage: `npm run sample-for-review -- --dir=output/ --percent=10`
  - Prioritization modes: all, flagged, new, random
  - Output formats: markdown (default) and JSON
  - Previous results tracking via `--results=` flag
- Added review result recording functionality:
  - `recordReviewResult()` - saves results to JSON file
  - `loadReviewResults()` - loads previous results
  - `getReviewedCompanies()` - extracts reviewed companies for tracking
- Inline quality checks (no external imports for CLI compatibility):
  - AI phrase detection (30+ common AI phrases)
  - Readability scoring (Flesch-Kincaid)
  - Text extraction from all content block types

**Files Created:**
- `docs/review-checklist.md` - Human review checklist document
- `scripts/quality/sample-for-review.ts` - Sampling CLI script
- `scripts/quality/__tests__/sample-for-review.test.ts` - 43 tests

**Tests:**
- 43 unit tests covering:
  - Company extraction from files/slugs
  - Quality checks and flagging
  - Priority determination
  - Stratified sampling selection
  - Review queue generation
  - Markdown and JSON output formatting
  - Review result recording and loading
  - Reviewed companies tracking
  - Integration tests for full workflow

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 657 passed, 2 todo (43 new tests)
- `npm run sample-for-review -- --dir=scripts/quality/samples --percent=50` - works correctly

### 2026-01-18 - Issue #15: Content quality control pipeline

**Completed:**
- Created unified quality control pipeline script `scripts/quality/quality-check.ts`
- Runs all quality checks in sequence:
  - Repetition detection (AI phrases, repeated content)
  - Readability scoring (Flesch-Kincaid)
  - Fact verification (claims requiring verification)
- Returns combined pass/fail/review status
- CLI usage: `npm run quality-check -- --input=file.json`
- Exit codes: 0=pass, 1=fail, 2=review needed
- Added `--verbose` flag for detailed output
- Created 28 tests for the unified pipeline

**Output Format (matches spec):**
```
- Repetition: PASS (0 duplicates)
- Readability: PASS (score: 65)
- Facts: REVIEW NEEDED (2 claims to verify)
```

**Files Created:**
- `scripts/quality/quality-check.ts` - Unified quality pipeline
- `scripts/quality/__tests__/quality-check.test.ts` - 28 tests

**All Sub-issues Complete:**
- #26 - Repetition detection automation
- #27 - Readability scoring system
- #28 - Company fact verification checklist
- #29 - Human review sampling workflow

**Verification:**
- `npm run lint` - passes with no errors
- `npm run type-check` - passes with no errors
- `npm run build` - successful production build
- `npm test` - 685 passed, 2 todo (28 new tests)
- `npm run quality-check -- --input=output/company-google-preview.json` - works correctly

---

## Stage 1 Complete

All Stage 1 (Foundation) issues are now closed:
- #3 - Repo setup, CI/CD, Next.js 14
- #6 - Module schema + position matrix
- #47 - Journey config schema
- #55 - Supabase project setup