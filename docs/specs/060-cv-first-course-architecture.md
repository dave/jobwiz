# CV-First Course Architecture

Status: proposal
Supersedes: the module/section/block content model (`src/types/module.ts`, `data/generated/modules/`)

## Premise

The course stops being prose we author and becomes a process run over the user's
own material. CV is the first input. The user builds a bank of stories from their
real career. Every subsequent answer draws on that bank.

Current model: 942 pre-baked JSON files keyed by company+role, flattened to a
carousel of passive text blocks. Measured: 2,371 text blocks across 105 company
modules collapse to 471 distinct once the company name is normalised out. It
cannot personalise because nothing in it declares what it is trying to teach.

## Core design decision: competency is the join key

One controlled vocabulary (~25-30 competencies) connects everything:

- a **Story** is tagged with the competencies it can evidence
- a **Question** requires competencies
- a **CompanyRoleBar** weights competencies for a given company + role
- **coverage** = the user's story-competency set vs. the bar's weighted set

Selection, gap detection, question-to-story matching and progress all fall out of
that one join. Deterministic, cheap, explainable, testable — no LLM in the
selection path. The LLM is used for extraction and critique only.

This is the "~20 modules cover hundreds of positions" premise done properly. The
reusable unit is a competency, which is small and composable. Prose is not.

## Data model

```
CandidateProfile
  id, user_id, source, parsed_at, raw_text, version
  roles: CareerRole[]

CareerRole                     // one per position on the CV
  id, profile_id
  company, title, start, end
  is_core                      // user-confirmed; drives story elicitation
  seniority, domain
  scope: { team_size?, budget?, users?, revenue? }
  cv_bullets: string[]         // raw material, verbatim
  seeds: StorySeed[]           // system-proposed, from bullets

StorySeed
  id, career_role_id
  prompt                       // "You led the K8s migration — that reads as a
                               //  Technical Leadership story. Tell it properly."
  source_bullet
  suggested_competencies: CompetencyId[]
  status: proposed | accepted | dismissed

Story                          // THE durable asset
  id, profile_id, career_role_id
  title
  situation, task, action, result    // structured fields, never one blob
  metrics: { label, value, verified }[]
  competencies: CompetencyId[]
  quality: { score, issues: QualityIssue[] }
  status: draft | reviewed | strong
  version, updated_at

Competency                     // the spine — hand-curated, ~25-30 total
  id, name, description
  probes: string[]             // what an interviewer is actually testing
  evidence_criteria: string[]  // what a story must contain to count

CompanyRoleBar                 // per company+role, generated from scraped data
  company_slug, role_slug
  required: { competency_id, weight, company_note }[]

Question                       // existing bank, re-tagged
  id, text, category, difficulty
  competencies: CompetencyId[]
  intents: { company_slug, role_slug, interviewer_intent }[]

Answer
  id, question_id, story_ids[]       // which stories back this answer
  draft, critique, status, version

CourseInstance                 // materialised at enrolment
  id, user_id, company_slug, role_slug
  profile_version, syllabus_version
  steps: ResolvedStep[]              // stable IDs
  progress: { step_id, status, completed_at }[]
```

Stable step IDs are content-addressed, written at materialisation. Regenerating
content produces a new `CourseInstance` version rather than corrupting saved
progress — the failure mode in the current system, where block IDs are derived
from array position at render time.

## Course flow

### Stage 1 — Intake
Upload CV (PDF / DOCX / paste). Parse to `CandidateProfile`. Show the extracted
roles back for confirmation; user marks which are core. Editable — parsing will
be wrong sometimes and the user must be able to fix it.

Output: confirmed `CareerRole[]`.

### Stage 2 — Story building
The heart of the course, and where most user time is spent.

Per core role, the system proposes story seeds from CV bullets. For each accepted
seed the user is walked through S/T/A/R one field at a time (progressive
disclosure — the existing carousel UX applies directly). After each field, a
targeted nudge rather than a form validation: missing metric, no real conflict,
personal contribution unclear, result not attributable.

On completion the story is critiqued and tagged with competencies. Target: 2-4
stories per core role.

Output: `Story[]`, the story bank.

### Stage 3 — Coverage and gaps
Story bank mapped against the target `CompanyRoleBar`. Renders as a coverage
matrix: competencies evidenced, weakly evidenced, absent.

Gaps drive the rest of the course. "You have no story showing you handled
conflict with a peer. Amazon will ask — it maps to Have Backbone. Which role
does this come from?" Gap-filling loops back into Stage 2.

Output: prioritised gap list.

### Stage 4 — Question practice
Questions filtered to company + role. For each, the system **pre-selects which of
their stories to use and shows why** — that mapping is the product. Company
`interviewer_intent` is shown as the framing (what is actually being tested),
then the user drafts and receives critique against that company's bar.

Answers reference stories. Improving a story improves every answer built on it.

Output: `Answer[]`.

### Stage 5 — Rehearsal
Timed drill over their own questions and stories. Export: a one-page mapping of
their stories to the questions most likely to be asked.

## Personalisation algorithm

```
selectCourse(profile, company, role):
  bar        = getCompanyRoleBar(company, role)
  stories    = getStories(profile)
  coverage   = matchCompetencies(stories, bar)      // pure function
  gaps       = bar.required
                 .filter(r => coverage[r.competency_id] < THRESHOLD)
                 .sortBy(r => -r.weight)
  questions  = getQuestions(company, role)
                 .sortBy(q => barWeight(q.competencies, bar))
  return materialise(seeds(profile), gaps, questions)
```

Pure and unit-testable. The only model calls in the whole system: CV parsing
(once per upload), story critique (per story), answer critique (per answer).

## Reuse / rewrite / delete

**Reuse as-is**
- Carousel UX — step-at-a-time progressive disclosure is exactly right for story building
- Auth, Stripe, routing, theming, AB testing infrastructure
- `data/generated/questions` `interviewer_intent` — 2,980 distinct values, the real asset
- Scraped Glassdoor/Reddit data and company themes — inputs to `CompanyRoleBar`

**Rewrite**
- `src/types/module.ts` → competency / story / course model
- `src/lib/carousel/load-modules.ts`, `flatten-modules.ts` → course materialisation
- `src/lib/modules/matrix.ts` → competency matching (currently dead code; filters on
  `company.industry`, a field the routing model does not have)
- `src/lib/content-fetching` → single read path

**Delete**
- `data/generated/modules/` — 942 files, 36MB, ~80% duplicated prose
- `src/lib/journey/config.ts` and `JourneyConfig`/`JourneyStep` types — unused
- `src/app/[company]/[role]/journey/learn/LearnContent.tsx` — orphaned
- One-off content mutation scripts (`add-video-placeholders.ts`, `remove-video-sections.ts`, …)

**Salvage from the question bank**
29 distinct question texts is thin, but 10 of them are story-eliciting behavioural
/ culture questions, which is roughly the right number for a competency spine.
Re-tag against competencies; regenerate technical questions per role.

## Consequences

- **Content volume drops by orders of magnitude.** ~30 competencies + ~30 question
  templates + N company bars, instead of 942 prose files. Every one becomes worth
  hand-curating.
- **The moat changes.** Not "we wrote pages about Google" — anyone can. It becomes
  the user's own story bank, which is portable across every interview they take and
  gets better the more they use it.
- **Public/SEO pages must be rebuilt.** Static, indexable, generated from the bar:
  "The 12 competencies Google tests for PMs." CTA is CV upload.
- **Single source of truth.** Today the landing page reads content from Supabase and
  the journey reads it from disk, with no sync — the DB loader (`scripts/load-content.ts`)
  is not wired to any npm script. This model has user data in Postgres and the
  competency/question spine in versioned files.

## Open questions

1. **Story bank ownership.** Scoped per target company+role, or one bank per user
   reused across every interview? (Recommend: per user. It is the retention hook.)
2. **CV parsing.** LLM extraction, or a dedicated resume-parsing service? Accuracy
   here gates everything downstream.
3. **Critique strictness.** Encouraging, or genuinely hard? A critic that says
   "great story!" to everything is worthless; one that is too harsh kills completion.
4. **Minimum viable bank.** How many stories before Stage 4 unlocks? Too high and
   users drop out during story building; too low and question practice is thin.
5. **No-CV path.** Career changers, new grads, users who will not upload. Manual
   role entry fallback, or blocked?
6. **Competency vocabulary source.** Hand-authored, or derived from the scraped
   interview reports? (Recommend: hand-authored v1, ~25 entries, validated against
   scraped data.)

## Staging

Each stage independently shippable; the current site keeps working until Stage E.

- **A. Foundations** — competency vocabulary, schema + Zod validation, `CompanyRoleBar`
  generation from scraped data, question re-tagging
- **B. Intake** — upload, parse, `CandidateProfile`, role confirmation UI
- **C. Story builder** — seeds, S/T/A/R flow, critique, competency tagging, bank UI
- **D. Coverage + practice** — matrix, gap loop, question-to-story matching, answer critique
- **E. Cutover** — new course flow replaces the journey/learn carousel; delete the
  module system; rebuild public pages off `CompanyRoleBar`
