# Ace That Interview - Course Structure & Progression (For Rework)

## Your Task

I need help reworking the course structure and progression for Ace That Interview (ace-that-interview.com). Below is everything about how the course currently works. I want you to help me rethink the structure, section ordering, content flow, and overall learning progression to make it more effective and engaging.

---

## What The Product Is

An interview prep platform targeting job seekers at specific companies. Users search for something like "Google PM interview prep," land on a tailored page at `ace-that-interview.com/google/product-manager`, and get a guided prep course.

**UX model:** Story-based progressive disclosure (like Lemonade insurance signup) - one step at a time, varied formats (video, audio, text, quotes, infographics, animations, multiple choice), with a timeline showing the full journey. No dashboard upfront - journey first.

The course is delivered as a full-screen carousel - one content block at a time, swiping/clicking through. Think of it like an Instagram story but for interview prep.

---

## How Modules Are Assembled Into A Course

Each course is assembled from reusable modules using a matrix system. When a user visits `/google/product-manager`, the system pulls together:

1. **Universal modules** (FREE) - Core interview skills for everyone
2. **Company modules** (PREMIUM) - Google-specific culture, process, values
3. **Company-role modules** (PREMIUM) - Google PM-specific questions, loop, assessment

They are displayed in that order, with a paywall between free and premium content.

**Note:** Role modules (generic PM prep) exist as fallbacks but are skipped when a company-role module exists to avoid duplication.

### Current module counts:
- 1 universal module
- 913 company modules
- 22 role modules
- 808 company-role modules

---

## Current Course Structure (What Users Actually See)

For a "Google Product Manager" course, the user currently goes through:

### Layer 1: Universal Fundamentals (FREE - 6 sections, 29 blocks)

| Section | Blocks | Block Types |
|---------|--------|-------------|
| Welcome to Your Interview Prep | 11 | header, text, text, quote, text, tip, header, text, text, warning, text |
| The Interview Mindset | 3 | text, quote, tip |
| The STAR Method | 5 | text, text, checklist, warning, quiz |
| Company Research That Matters | 4 | text, text, checklist, tip |
| Questions to Ask | 3 | text, text, warning |
| Post-Interview Best Practices | 3 | text, checklist, tip |

**Content summary:** Welcome/motivation, mindset framing, STAR method intro, how to research companies, questions to ask interviewers, follow-up etiquette.

### [PAYWALL]

### Layer 2: Company Module - Google (PREMIUM - 5 sections, 23 blocks)

| Section | Blocks | Block Types |
|---------|--------|-------------|
| Google Culture | 3 | text, text, tip |
| What Interviewers Look For | 12 | header, text, text, tip, tip, text, tip, tip, text, tip, tip, text |
| Google Values | 3 | text, checklist, warning |
| Google Interview Process | 2 | text, checklist |
| Google Interview Tips | 3 | text, tip, quiz |

**Content summary:** Google culture overview, interviewer psychology (behavioral/culture fit/curveball question analysis), Google values checklist, interview process stages, tips.

### Layer 3: Company-Role Module - Google PM (PREMIUM - 10 sections, 82 blocks)

| Section | Blocks | Block Types |
|---------|--------|-------------|
| Role Overview | 2 | text, text |
| Common Interview Format | 2 | text, tip |
| How to Structure Your Answers | 24 | header, text, tip, then 4x(quote, text, checklist, tip), text |
| Key Competencies | 2 | text, checklist |
| Mistakes to Avoid | 23 | header, text, then 4 groups of (text + 4 warnings), tip |
| Preparation Checklist | 2 | text, checklist |
| Behavioral Questions for PM | 7 | text, tip, 5x quiz |
| Technical Questions for PM | 7 | text, tip, 5x quiz |
| Culture Fit Questions for PM | 7 | text, warning, 5x quiz |
| Curveball Questions | 6 | text, tip, 4x quiz |

**Content summary:** PM role overview, interview loop format, answer frameworks (STAR+leadership, product design, metrics, strategy), competency checklist, common mistakes (behavioral/product/metrics/strategy), prep checklist, then 4 quiz sections (behavioral, technical, culture fit, curveball).

---

## Total User Journey

A Google PM user currently sees approximately **134 blocks** in sequence:
- 29 free blocks (universal)
- Paywall
- 23 company blocks (Google)
- 82 company-role blocks (Google PM)

Each block is one full-screen "slide" in the carousel.

---

## Content Block Types Available

These are the building blocks we can use in any section:

| Type | Purpose | Interactive? |
|------|---------|-------------|
| `text` | Paragraph text (supports markdown) | No |
| `header` | Heading (h1, h2, h3) | No |
| `quote` | Pull quote with optional author | No |
| `tip` | Green highlighted tip with icon | No |
| `warning` | Yellow/red warning with icon | No |
| `video` | Embedded video (YouTube/Vimeo) | Yes |
| `audio` | Audio player with controls | Yes |
| `image` | Single image | No |
| `quiz` | Multiple choice question | Yes |
| `checklist` | Checkable items (persisted) | Yes |
| `infographic` | High-res image with zoom | No |
| `animation` | Lottie JSON animation | No |

---

## Module Templates (What Content Generators Follow)

### Universal Module Template
8 sections planned:
1. Introduction (200 words) - Welcome, set expectations
2. Understanding the Interview Process (400 words) - Typical stages
3. First Impressions (350 words) - First 5 minutes
4. Behavioral Questions 101 (500 words) - STAR method
5. Common Pitfalls (300 words) - Mistakes to avoid
6. Questions to Ask (300 words) - Smart counter-questions
7. Following Up (200 words) - Thank you notes
8. [Optional] Handling Rejection (150 words) - Resilience

### Company Module Template
8 sections planned:
1. Company Overview (300 words) - Founding, size, mission, news
2. Company Culture & Values (400 words) - What company values
3. Interview Process (350 words) - Specific stages & timeline
4. What Interviewers Really Want (400 words) - Psychology behind questions
5. Common Questions at {Company} (500 words) - Frequently asked
6. [Optional] {Company} Trivia (200 words) - Fun facts
7. Red Flags & Deal Breakers (250 words) - What gets candidates rejected
8. Insider Tips (300 words) - Advice from successful candidates

### Company-Role Module Template
9 sections planned:
1. The {Role} at {Company} (350 words) - What makes this role unique here
2. The Interview Bar (400 words) - Specific skills wanted
3. The {Role} Interview Loop at {Company} (450 words) - Exact rounds & format
4. Technical/Skills Assessment (500 words) - Assessment format
5. {Company}-Specific {Role} Questions (600 words) - Common questions
6. Behavioral Expectations (400 words) - Company values + role context
7. [Optional] Salary & Leveling (350 words) - Compensation by level
8. [Optional] Success Stories (250 words) - Quotes from successful hires
9. Red Flags & Rejection Patterns (300 words) - Why candidates fail

---

## Sample Content (Universal Module Intro)

Here's what the actual generated content looks and feels like:

> **"Hey, let's get you ready for this."**
>
> You're about to go through something different from the usual interview prep. No endless lists of 'Top 100 Questions' to memorize. No generic advice like 'be confident' or 'research the company.' You've probably tried that already.
>
> What we've built here comes from real data - thousands of interview experiences from Reddit, Glassdoor, and people who've actually been through the process at your target company. We've distilled it into what actually matters.
>
> *"The key insight: interviewers aren't looking for perfect answers. They're looking for how you think."*
>
> You'll move through three layers:
> 1. **Fundamentals** - Core interview skills that work everywhere
> 2. **Company-specific** - What makes interviewing at your target company different
> 3. **Role-specific** - Technical depth for your particular role

---

## What I Think Might Be Wrong

Here are my concerns (but I'm open to hearing yours too):

1. **134 blocks is a LOT** - Is this too long? Do people drop off? Should we trim?
2. **The progression feels off** - Universal basics first, then company, then role. Should it be interleaved differently? Should the most exciting/specific stuff come earlier to hook people?
3. **Too many consecutive text/tip blocks** - Some sections are just walls of text blocks. The "What Interviewers Look For" section has 12 blocks that are mostly text and tips.
4. **The "Mistakes to Avoid" section has 23 blocks** - That's nearly as long as the entire Google company module. Too much?
5. **Quiz sections feel tacked on at the end** - 4 sections of pure quizzes back-to-back. Should quizzes be interspersed throughout?
6. **Not enough variety in block types** - Very few videos, images, infographics, or animations used in practice. Mostly text + tip + quiz.
7. **Paywall placement** - Is right after universal basics the right spot? Should we give more of a taste of company-specific content first?
8. **No clear "you're making progress" feeling** - The sections don't have a strong narrative arc or sense of building toward something.

---

## Constraints To Keep In Mind

- **Module system must stay modular** - Universal content must work for ALL companies/roles, company content for ALL roles at that company, company-role content for that specific combo only.
- **Content blocks are the atomic unit** - Each block = one full-screen slide. Can't show multiple blocks at once.
- **Block types are fixed** - We have the 12 types listed above. Adding new types is possible but non-trivial.
- **Content is AI-generated** - We can regenerate all content from templates, so restructuring is feasible.
- **Free content must be valuable enough to hook** - But not so complete that there's no reason to pay.
- **Target audience** - Job seekers actively preparing for interviews at specific companies. High motivation, time-pressed.

---

## What I Want From You

1. **Critique the current structure** - What's working, what isn't, and why.
2. **Propose a new structure** - New section ordering, content flow, and progression for each module type.
3. **Think about pacing** - How to keep engagement high across 100+ blocks.
4. **Consider the paywall** - Where should it go for maximum conversion?
5. **Suggest block type variety** - How to use more than just text/tip/quiz.
6. **Think about the narrative arc** - How does the user feel at each stage? What's the emotional journey?

Be specific. Give me concrete section orders, block type mixes, and rationale for changes.
