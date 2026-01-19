# Activity Log for Issue #228: Module Content Quality Fixes

Parent Issue: [#228](https://github.com/anthropics/jobwiz-session-1/issues/228)

## Summary

Fix content quality issues identified during manual review of interview prep modules. Issues span data (JSON), display (UI), and architecture across 948 module files.

## Sub-issues Checklist

### Quick Automated Fixes
- [x] #229 - Remove em-dashes from all modules

### Quiz Format Overhaul (#234)
- [x] #235 - Create ReflectionItem component
- [x] #236 - Add detection logic to QuizItem
- [x] #237 - Add tests
- [x] #238 - Visual QA

### Remove Role-Specific Content (#230)
- [ ] #279 - Big Tech batch
- [ ] #280 - High-growth startups batch
- [ ] #281 - Finance batch
- [ ] #282 - Consulting batch
- [ ] #283 - E-commerce/Retail batch
- [ ] #284 - Healthcare/Biotech batch
- [ ] #285 - Enterprise SaaS batch
- [ ] #286 - Media/Entertainment batch
- [ ] #287 - Other companies batch

### Content Ordering (#239)
- [ ] #288 - Big Tech batch
- [ ] #289 - High-growth startups batch
- [ ] #290 - Finance batch
- [ ] #291 - Consulting batch
- [ ] #292 - E-commerce/Retail batch
- [ ] #293 - Healthcare/Biotech batch
- [ ] #294 - Enterprise SaaS batch
- [ ] #295 - Media/Entertainment batch
- [ ] #296 - Other companies batch

### Missing Introductions (#244)
- [x] #245 - Add STAR section intro
- [x] #246 - Add Research section intro
- [x] #247 - Audit role modules
- [x] #248 - Add intros to role modules

### Grammar Fixes (#249)
- [x] #259 - Universal + Industry modules
- [x] #260 - Role modules
- [ ] #261-#269 - Company modules (by category)
- [ ] #270-#278 - Company-role modules (by category)

### Role → Company-Role Merge (#253)
- [ ] #256 - Update load-modules.ts
- [ ] #257 - Test fallback behavior
- [ ] #258 - Manual review
- [ ] #297-#305 - Batch merges by category

---

## Progress Log

### 2026-01-19 - Issue #229: Remove em-dashes from all modules

**Completed:**
- Created `scripts/cleanup/remove-em-dashes.ts` script
- Replaced all em-dash characters (—) with space-hyphen-space ( - )
- Fixed 10 files with 19 total em-dash replacements:
  - universal-fundamentals.json (8)
  - industry-finance.json (2)
  - industry-tech.json (2)
  - role-backend-engineer.json (1)
  - role-business-analyst.json (1)
  - role-data-engineer.json (1)
  - role-management-consultant.json (1)
  - role-marketing-manager.json (1)
  - role-sales-engineer.json (1)
  - role-software-engineer.json (1)

**Verification:**
- `grep "—" data/generated/modules/*.json` returns empty
- `npm run lint` - passes
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

### 2026-01-19 - Issue #235: Create ReflectionItem component

**Completed:**
- Created `src/components/carousel/items/ReflectionItem.tsx` component
- Component displays "Demonstrate..." quizzes as reflection/guidance format
- Layout sections:
  - 💭 Interview Question (blue) - prominent question display with quotes
  - ✓ What to Demonstrate (green) - correct answer shown as guidance
  - ⚠ Common Mistakes to Avoid (amber) - incorrect answers as bullet list
  - 💡 Tip (purple) - explanation text
- Continue button calls `onComplete` callback
- Exported from `src/components/carousel/items/index.ts`

**Files Created:**
- `src/components/carousel/items/ReflectionItem.tsx`
- `src/components/carousel/items/__tests__/ReflectionItem.test.tsx`

**Tests:**
- 33 unit tests covering:
  - Rendering (question, sections, labels, buttons)
  - Without explanation (no Tip section)
  - Without correct answer (no What to Demonstrate section)
  - onComplete callback
  - Accessibility (ARIA labels on all regions)
  - Styling (correct color backgrounds)
  - Layout (min-height, centered, max-width)
  - Edge cases (single incorrect, only correct, empty options, long text, special chars)

**Verification:**
- `npm run lint` - passes
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="ReflectionItem"` - 33 tests pass

**Acceptance Criteria:**
- ✅ Component renders question prominently
- ✅ Correct answer shown as "What to demonstrate"
- ✅ Wrong answers shown as "Common mistakes" bullets
- ✅ Explanation shown as tip
- ✅ Styling matches other carousel items (Tailwind, centered, responsive)
- ✅ Accessible (proper ARIA, keyboard nav)

### 2026-01-19 - Issue #236: Add reflection mode detection to QuizItem

**Completed:**
- Added `isReflectionQuiz` detection function to QuizItem
- Detection criteria:
  - Correct answer starts with "Demonstrate" (case-insensitive, whitespace-trimmed)
  - Correct answer is significantly longer than average wrong answer (1.5x threshold)
- QuizItem now delegates to ReflectionItem when detection passes
- Refactored QuizItem into wrapper + QuizItemInteractive to maintain React hooks rules

**Files Modified:**
- `src/components/carousel/items/QuizItem.tsx` - Added detection logic and delegation
- `src/components/carousel/items/__tests__/QuizItem.test.tsx` - Added 12 new tests

**Tests Added:**
- 12 unit tests covering:
  - `isReflectionQuiz` function: true for Demonstrate..., false for normal quiz
  - Edge cases: no correct answer, no wrong answers, short Demonstrate, non-Demonstrate long
  - Case-insensitive detection
  - Whitespace handling
  - QuizItem rendering: delegates to ReflectionItem, passes props

**Verification:**
- `npm run lint` - passes
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="QuizItem"` - 39 passed, 2 pre-existing failures (class name mismatches)
- `npm test -- --testPathPattern="modules|Reflection"` - 110 tests pass

**Acceptance Criteria:**
- ✅ Detection function correctly identifies "Demonstrate..." quizzes
- ✅ Normal quizzes still render as multiple choice
- ✅ Reflection quizzes render via ReflectionItem
- ✅ No breaking changes to existing quiz behavior

### 2026-01-19 - Issue #237: Add tests for ReflectionItem and detection logic

**Status:** Already complete - tests were added as part of #235 and #236

**Tests Already Implemented:**

ReflectionItem tests (33 tests in `src/components/carousel/items/__tests__/ReflectionItem.test.tsx`):
- Rendering (question, sections, labels, buttons)
- Without explanation (no Tip section)
- Without correct answer (no What to Demonstrate section)
- onComplete callback
- Accessibility (ARIA labels on all regions)
- Styling (correct color backgrounds)
- Layout (min-height, centered, max-width)
- Edge cases (single incorrect, only correct, empty options, long text, special chars)

Detection logic tests (12 tests in `src/components/carousel/items/__tests__/QuizItem.test.tsx`):
- `isReflectionQuiz` function tests:
  - Returns true for quiz with Demonstrate... that is significantly longer
  - Returns false for normal trivia quiz
  - Returns false when correct doesn't start with Demonstrate
  - Returns false when Demonstrate answer isn't significantly longer
  - Returns false when no correct answer exists
  - Returns false when no wrong answers exist
  - Handles case-insensitive Demonstrate detection
  - Handles whitespace before Demonstrate
- QuizItem rendering tests:
  - Renders as ReflectionItem when detected as reflection quiz
  - Renders as interactive quiz when not a reflection quiz
  - Passes onComplete to ReflectionItem
  - Passes className to ReflectionItem

**Verification:**
- `npm test -- --testPathPattern="ReflectionItem"` - 33 tests pass
- `npm test -- --testPathPattern="QuizItem" --testNamePattern="Reflection|isReflectionQuiz"` - 12 tests pass

**Acceptance Criteria:**
- ✅ ReflectionItem tests pass
- ✅ Detection logic tests pass
- ✅ Coverage for edge cases
- ✅ Relevant tests for #237 pass (pre-existing failures in other test files are unrelated)

### 2026-01-19 - Issue #238: Visual QA for reflection mode across modules

**Completed:**
- Manually tested reflection mode across 4 journeys:
  - Google Software Engineer - 19 reflection quizzes found, rendering correctly
  - Google Product Manager - 19 reflection quizzes found, rendering correctly
  - Amazon Software Engineer - 19 reflection quizzes found, rendering correctly
  - McKinsey Management Consultant - 19 reflection quizzes found, rendering correctly
- Verified all "Demonstrate..." quizzes render as ReflectionItem (not multiple choice)
- Verified normal quizzes still render as interactive multiple choice
- Verified Continue button works and advances to next item
- Tested mobile viewport (375x667) - responsive layout confirmed
- Captured screenshots for documentation

**Screenshots Captured:**
- `screenshots/238-reflection-item-desktop.png` - Desktop view of reflection item
- `screenshots/238-reflection-item-full.png` - Full page view showing all 4 sections
- `screenshots/238-reflection-item-mobile.png` - Mobile responsive view
- `screenshots/238-reflection-google-pm.png` - Google PM journey
- `screenshots/238-reflection-amazon-swe.png` - Amazon SWE journey
- `screenshots/238-reflection-mckinsey-mc.png` - McKinsey MC journey
- `screenshots/238-normal-quiz-multiple-choice.png` - Normal quiz still renders as multiple choice

**Verification:**
- `npm run lint` - passes (warnings only)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="Reflection|QuizItem"` - 72 passed, 2 pre-existing failures

**Acceptance Criteria:**
- ✅ All "Demonstrate..." quizzes render as reflection format
- ✅ No broken layouts
- ✅ Readable on desktop and mobile
- ✅ Continue button works
- ✅ Screenshots captured for documentation

### 2026-01-19 - Issue #245: Add behavioral questions intro before STAR section

**Completed:**
- Added intro text block before STAR method content in `data/generated/modules/universal-fundamentals.json`
- Intro explains what behavioral questions are
- Includes example phrases:
  - "Tell me about a time when..."
  - "Describe a situation where..."
  - "Give me an example of..."
- Explains why interviewers use them (to understand actual behavior, not hypothetical)

**Files Modified:**
- `data/generated/modules/universal-fundamentals.json` - Added intro block before STAR content

**Verification:**
- JSON is valid
- `npm run lint` - passes (warnings only)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

**Acceptance Criteria:**
- ✅ Intro block added before STAR content
- ✅ Explains what behavioral questions are
- ✅ Gives example phrases
- ✅ Explains why interviewers use them
- ✅ JSON valid after edit

### 2026-01-19 - Issue #246: Add company research intro before research section

**Completed:**
- Added intro text block before the Research section in `data/generated/modules/universal-fundamentals.json`
- Intro explains why company research matters
- Lists specific benefits:
  - Ask informed questions that show genuine interest
  - Tailor your answers to what the company values
  - Spot red flags before accepting an offer
  - Stand out from candidates who only read the 'About Us' page
- Preserves existing research content as a follow-up paragraph

**Files Modified:**
- `data/generated/modules/universal-fundamentals.json` - Added intro block before research content

**Verification:**
- JSON is valid (python3 -m json.tool validation passes)
- `npm run lint` - passes (warnings only)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

**Acceptance Criteria:**
- ✅ Intro block added before research content
- ✅ Explains why research matters
- ✅ Lists specific benefits
- ✅ JSON valid after edit

### 2026-01-19 - Issue #247: Audit role modules for missing introductions

**Completed:**
- Audited all 22 role modules for sections lacking proper introductions
- Modules reviewed:
  - role-account-executive.json
  - role-backend-engineer.json
  - role-business-analyst.json
  - role-data-engineer.json
  - role-data-scientist.json
  - role-devops-engineer.json
  - role-engineering-manager.json
  - role-financial-analyst.json
  - role-frontend-engineer.json
  - role-machine-learning-engineer.json
  - role-management-consultant.json
  - role-marketing-manager.json
  - role-mobile-engineer.json
  - role-product-designer.json
  - role-product-manager.json
  - role-qa-engineer.json
  - role-sales-engineer.json
  - role-security-engineer.json
  - role-software-engineer.json
  - role-solutions-architect.json
  - role-technical-program-manager.json
  - role-ux-researcher.json

**Findings:**
All 22 role modules share identical structure. Sections needing intros:

1. **Key Competencies** (HIGH priority)
   - Currently starts with bare checklist
   - Missing: Explanation of what these competencies are and why they matter

2. **Preparation Checklist** (MEDIUM priority)
   - Currently starts with bare checklist
   - Missing: Context for how/when to use the checklist

**Sections with adequate introductions:**
- ✅ Role Overview - Good intro text
- ✅ Common Interview Format - Good intro text
- ✅ How to Structure Your Answers - Has header + intro text
- ✅ Mistakes to Avoid - Has header + intro text

**Priority Ranking:**
1. Key Competencies (HIGH) - Users see early; need context
2. Preparation Checklist (MEDIUM) - At end; less critical

**Total Fixes Needed:** 44 intro blocks (2 sections × 22 modules)

**Acceptance Criteria:**
- ✅ All 22 role modules reviewed
- ✅ List of sections needing intros documented
- ✅ Priority ranking for fixes created

### 2026-01-19 - Issue #248: Add missing introductions to role modules

**Completed:**
- Created `scripts/cleanup/add-role-intros.ts` script
- Added introductions to 2 sections across all 22 role modules:
  1. **Key Competencies** - Role-specific intro explaining what competencies are and why they matter
  2. **Preparation Checklist** - Context-setting intro for how/when to use the checklist
- Total: 44 intro blocks added (2 per module)

**Role-specific intros added:**
- Each role has a customized Key Competencies intro that references the specific role
- Preparation Checklist intro mentions the role name dynamically

**Files Created:**
- `scripts/cleanup/add-role-intros.ts` - Script to add intros to role modules

**Files Modified:**
- All 22 role modules in `data/generated/modules/role-*.json`

**Verification:**
- All JSON files valid (python3 -m json.tool validation passes)
- `npm run lint` - passes (warnings only)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

**Acceptance Criteria:**
- ✅ All flagged sections have intros
- ✅ Intros explain what/why before how
- ✅ Tone consistent with existing content
- ✅ JSON valid after edits

### 2026-01-19 - Issue #259: Grammar review - Universal + Industry modules

**Completed:**
- Reviewed all 7 files in scope:
  - `universal-fundamentals.json` - No issues found
  - `industry-consulting.json` - No issues found
  - `industry-enterprise.json` - No issues found
  - `industry-finance.json` - No issues found
  - `industry-healthcare.json` - No issues found
  - `industry-retail.json` - No issues found
  - `industry-tech.json` - No issues found

**Review Criteria:**
- Incomplete sentences
- Missing punctuation
- Sentence fragments
- Grammar errors

**Findings:**
All 7 files have correct grammar:
- All sentences are complete with proper punctuation
- No fragments or incomplete sentences
- Clear, professional writing throughout
- No grammar errors detected

**Verification:**
- All 7 JSON files valid (python3 -m json.tool validation passes)
- `npm run lint` - passes (warnings only for unrelated image issues)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

**Acceptance Criteria:**
- ✅ All 7 files reviewed
- ✅ All grammar issues fixed (none found)
- ✅ JSON valid after edits (no edits needed)

### 2026-01-19 - Issue #260: Grammar review - Role modules

**Completed:**
- Reviewed all 22 role modules for grammar issues:
  - `role-account-executive.json` - No issues found
  - `role-backend-engineer.json` - No issues found
  - `role-business-analyst.json` - No issues found
  - `role-data-engineer.json` - No issues found
  - `role-data-scientist.json` - No issues found
  - `role-devops-engineer.json` - No issues found
  - `role-engineering-manager.json` - No issues found
  - `role-financial-analyst.json` - No issues found
  - `role-frontend-engineer.json` - No issues found
  - `role-machine-learning-engineer.json` - No issues found
  - `role-management-consultant.json` - No issues found
  - `role-marketing-manager.json` - No issues found
  - `role-mobile-engineer.json` - No issues found
  - `role-product-designer.json` - No issues found
  - `role-product-manager.json` - No issues found
  - `role-qa-engineer.json` - No issues found
  - `role-sales-engineer.json` - No issues found
  - `role-security-engineer.json` - No issues found
  - `role-software-engineer.json` - No issues found
  - `role-solutions-architect.json` - No issues found
  - `role-technical-program-manager.json` - No issues found
  - `role-ux-researcher.json` - No issues found

**Review Criteria:**
- Incomplete sentences
- Missing punctuation
- Sentence fragments
- Grammar errors

**Findings:**
All 22 role modules have correct grammar:
- All sentences are complete with proper punctuation
- No fragments or incomplete sentences
- Clear, professional writing throughout
- No grammar errors detected

**Verification:**
- `npm run build` - successful
- All JSON files are valid

**Acceptance Criteria:**
- ✅ All 22 role modules reviewed
- ✅ All grammar issues fixed (none found)
- ✅ JSON valid after edits (no edits needed)

### 2026-01-19 - Issue #261: Grammar review - Company modules: Big Tech

**Completed:**
- Reviewed all 12 Big Tech company modules:
  - `company-google.json` - No issues found
  - `company-meta.json` - No issues found
  - `company-amazon.json` - No issues found
  - `company-apple.json` - No issues found
  - `company-microsoft.json` - No issues found
  - `company-netflix.json` - No issues found
  - `company-nvidia.json` - 2 issues found and fixed
  - `company-intel.json` - No issues found
  - `company-amd.json` - No issues found
  - `company-cisco.json` - No issues found
  - `company-tesla.json` - No issues found
  - `company-adobe.json` - 1 issue found and fixed

**Issues Fixed:**

1. **company-nvidia.json - Common Interview Questions section:**
   - Contained garbled/incomplete scraped content like `"why not do this as a career?"` and `"the recruiter or checked out the JD in detail?"`
   - Replaced with proper "What to Expect" section with complete sentences

2. **company-nvidia.json - Insider Tips section:**
   - Contained incomplete fragments: `"you're prepared for *system design* questions (e"` (cut off mid-word)
   - Replaced with proper insider tips with complete sentences

3. **company-adobe.json - Timeline value:**
   - Timeline showed "0 weeks" which is incorrect
   - Fixed to "2-4 weeks" to match other Big Tech companies

**Files Modified:**
- `data/generated/modules/company-nvidia.json` - Fixed 2 sections
- `data/generated/modules/company-adobe.json` - Fixed timeline value

**Verification:**
- All JSON files valid (python3 -m json.tool validation passes)
- `npm run lint` - passes (warnings only for unrelated image issues)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

**Acceptance Criteria:**
- ✅ All 12 Big Tech company modules reviewed
- ✅ All grammar issues fixed (3 issues found and fixed)
- ✅ JSON valid after edits

### 2026-01-19 - Issue #262: Grammar review for High-growth startup company modules

**Status:** Complete

**Modules Reviewed (14 total):**
- stripe, figma, notion, vercel, databricks, snowflake, airbnb, uber, lyft, doordash, instacart, coinbase, robinhood, plaid

**Issues Found and Fixed:**

1. **company-vercel.json - "Common Interview Questions" section (lines 186-191):**
   - Contained garbled scraper content: `"Is this an in-person or virtual interview?"`, `"ensure adequate storage is available..."`
   - Fixed: Replaced with relevant "What to Expect" section covering React, Next.js, edge computing, and performance optimization topics

2. **company-vercel.json - "Insider Tips" section (lines 238-241):**
   - Contained incomplete scraped fragments like `"here: if you put time and effort..."`, `"I see often is to find _anyone_ at a target..."`
   - Fixed: Replaced with relevant tips about deploying to Vercel, understanding Next.js, Core Web Vitals, and developer experience

3. **company-plaid.json - "Common Interview Questions" section (lines 186-190):**
   - Contained nonsense scraped content: `"I gave him my bank, routing and account numbers..."`, `"Are you ready for your training?"`, `"plastics company?"`
   - Fixed: Replaced with relevant "What to Expect" section covering fintech APIs, security, and systems design

4. **company-plaid.json - "Insider Tips" section (lines 238-241):**
   - Contained irrelevant scraped content about Big 4 jobs, suit colors, and general career advice
   - Fixed: Replaced with relevant tips about Plaid's API documentation, data security/compliance, and fintech ecosystem

**Files Modified:**
- `data/generated/modules/company-vercel.json` - Fixed 2 sections
- `data/generated/modules/company-plaid.json` - Fixed 2 sections

**Verification:**
- All JSON files valid (python3 -m json.tool validation passes)
- `npm run lint` - passes (warnings only for unrelated image issues)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

**Acceptance Criteria:**
- ✅ All 14 High-growth startup company modules reviewed
- ✅ All grammar issues fixed (4 issues found and fixed)
- ✅ JSON valid after edits

### 2026-01-19 - Issue #263: Grammar review - Company modules: Finance

**Status:** Complete

**Modules Reviewed (14 total):**
- goldman-sachs, jpmorgan, morgan-stanley, bank-of-america, citadel, two-sigma, jane-street, blackrock, fidelity, charles-schwab, visa, mastercard, paypal, block

**Issues Found and Fixed:**

1. **company-fidelity.json - Timeline value:**
   - Timeline showed "16 weeks" which is unrealistic for interview processes
   - Fixed: Changed to "2-4 weeks" to match other Finance companies

**Files Modified:**
- `data/generated/modules/company-fidelity.json` - Fixed timeline value

**Verification:**
- All JSON files valid (python3 -m json.tool validation passes)
- `npm run lint` - passes (warnings only for unrelated image issues)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

**Acceptance Criteria:**
- ✅ All 14 Finance company modules reviewed
- ✅ All grammar issues fixed (1 issue found and fixed)
- ✅ JSON valid after edits

### 2026-01-19 - Issue #264: Grammar review - Company modules: Consulting

**Status:** Complete

**Modules Reviewed (10 total):**
- mckinsey, bcg, bain, deloitte, accenture, pwc, ey, kpmg, capgemini, booz-allen

**Issues Found and Fixed:**

1. **company-bain.json - Interview Process section:**
   - Had "1 rounds typical" which is grammatically incorrect
   - Fixed: Changed to "1 round typical" (singular)

**Files Modified:**
- `data/generated/modules/company-bain.json` - Fixed "rounds" to "round"

**Verification:**
- All JSON files valid (python3 -m json.tool validation passes)
- `npm run lint` - passes (warnings only for unrelated image issues)
- `npm run type-check` - passes
- `npm run build` - successful
- `npm test -- --testPathPattern="modules"` - 77 tests pass

**Acceptance Criteria:**
- ✅ All 10 Consulting company modules reviewed
- ✅ All grammar issues fixed (1 issue found and fixed)
- ✅ JSON valid after edits

