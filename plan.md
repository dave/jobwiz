# Plan: Course Structure Rework

## Summary

Shift from source-first assembly (universal → company → company-role) to **journey-slot assembly** where content from all module types is interleaved into a narrative arc. Reduce total blocks from ~134 to ~50-65. Lead with company-role specificity. Interleave quizzes throughout.

## Unresolved Questions

1. **Role family count** — GPT suggests 5 master templates (PM/strategy, engineering, design, biz/ops/sales, consulting). Are these the right groupings? Any roles that don't fit?
2. **Content regeneration scope** — Do we regenerate all 942 modules, or start with a subset (e.g. top 20 company-role combos) and iterate?
3. **Paywall pricing** — Currently $199. Does restructuring change the pricing strategy?
4. **Existing user progress** — Any users with saved progress that would break if we restructure? Or is this pre-launch?
5. **Audio/video content** — GPT recommends more audio clips (e.g. "hear a strong answer opening"). Do we want to invest in generating those now, or stub them out?
6. **Industry modules** — Currently loaded but skipped in carousel. Kill them entirely, or repurpose?

---

## Stage 1: Define Journey Spine & Role Families

**Goal:** Create the type system and config for slot-based assembly.

### Task 1.1: Define role family types and mapping
- Add `RoleFamily` type: `pm-strategy`, `engineering`, `design`, `business`, `consulting`
- Create `role-families.ts` config mapping each existing role slug → role family
- Each role family defines its question families (e.g. PM → behavioral, product-design, metrics, strategy)

### Task 1.2: Define journey slot types
- Add `JourneySlot` type with slots like: `welcome`, `interview-snapshot`, `screening-signals`, `answer-framework`, `practice-preview`, `paywall`, `full-loop`, `role-bar`, `question-family-1..N`, `culture-fit`, `failure-patterns`, `prep-sprint`
- Each slot has: source preference (universal/company/company-role/any), required vs optional, max blocks

### Task 1.3: Define master course templates
- One template per role family
- Each template = ordered list of slots with role-family-specific question family names
- Example PM template: slots with question families = product-design, metrics, strategy
- Example SWE template: slots with question families = coding, system-design, debugging

**Acceptance:** Types compile. Config covers all 22 existing role slugs. Each role family has a master template with named slots.

---

## Stage 2: Redesign Module Templates

**Goal:** Rewrite content generation templates to produce slot-compatible, shorter modules.

### Task 2.1: Redesign universal module template
- Target: ~15 blocks (down from 29)
- Sections: welcome (2 blocks), how interviews are judged (3), build better answers (4), common mistakes (3), questions to ask + follow-up (3)
- STAR becomes one tool inside "build better answers", not its own section
- Enforce pacing rules: no section >6 blocks, no >2 passive blocks in a row

### Task 2.2: Redesign company module template
- Target: ~15 blocks (down from 23)
- Sections: what makes this company different in interviews (3), values → interview signals (4), process + timeline (3), what gets people rejected (3), insider edge (2)
- Cut "company overview" / founding story / trivia unless it directly affects interviews
- Every block should answer: "how should I behave differently because this is Company X?"

### Task 2.3: Redesign company-role module template
- Target: ~34 blocks (down from 82)
- Sections: the bar for this role here (4), interview loop breakdown (4), then 2-4 question-family sections (4-5 blocks each), culture-fit in context (4), failure patterns (4), final prep sprint (3)
- Question families vary by role family (defined in Stage 1)
- Each question-family section follows: what it tests → framework → example → practice quiz → mistake → second quiz

### Task 2.4: Enforce global pacing rules in templates
- No section >6 blocks (8 max rare cases)
- No >2 passive blocks in a row
- Every 4-6 blocks must include an interaction (quiz/checklist)
- Every section ends with quiz, checklist, or action prompt
- Ideal block type mix: text 35%, quiz 20%, checklist 12%, tip 10%, warning 8%, infographic 8%, quote 5%, media 2-5%

**Acceptance:** New template files in `/templates/v2/`. Each template produces content matching pacing rules. Docs/specs updated with new editorial constraints.

---

## Stage 3: New Assembly Logic

**Goal:** Replace source-first flattening with slot-based journey assembly.

### Task 3.1: New module loader with slot awareness
- Update `load-modules.ts` to tag each module's sections with slot assignments
- Modules still loaded from filesystem same way, but sections get mapped to journey slots
- Add section-to-slot mapping metadata (either in module JSON or in assembly config)

### Task 3.2: New flatten logic — slot-based assembly
- Replace sequential module flattening with slot-based interleaving
- Input: loaded modules + master course template for this role family
- For each slot in the template:
  - Pull matching sections from the right module(s)
  - Respect source preference (e.g. "interview-snapshot" prefers company-role, falls back to company)
  - Enforce max block count per slot
- Paywall inserted after the free slots (configurable per template, ~slot 5-6)
- Output: same `CarouselItem[]` format (no downstream changes needed)

### Task 3.3: Graceful degradation for sparse data
- When company-role module doesn't exist → use company + role modules
- When company module doesn't exist → use universal + role only
- Slots with no content source → skip (don't show empty sections)
- Minimum viable course = universal + role (no company data)

### Task 3.4: Update paywall placement
- Paywall goes after: interview snapshot + screening signals + one framework + one practice moment
- User should feel "this is clearly for [Company] [Role]" before paywall
- Free section target: 12-16 blocks of specific, useful content

**Acceptance:** Same carousel UI renders correctly. Blocks appear in journey-slot order, not module-source order. Free content includes company-role specificity. Tests pass for courses with full data, partial data, and minimal data.

---

## Stage 4: Content Regeneration (Pilot)

**Goal:** Regenerate content for top company-role combos using new templates.

### Task 4.1: Update content generation prompts
- Update AI generation prompts to match v2 templates
- Add section-to-slot metadata in generated JSON
- Add question-family tags to sections

### Task 4.2: Regenerate pilot set
- Pick ~10-20 high-traffic company-role combos (Google PM, Amazon SDE, Meta PM, etc.)
- Regenerate universal module (1)
- Regenerate company modules for pilot companies (~10)
- Regenerate company-role modules for pilot combos (~20)
- Validate block counts, pacing rules, block type mix

### Task 4.3: QA and iteration
- Review generated content against pacing rules
- Test full carousel flow for pilot courses
- Compare old vs new experience
- Adjust templates/prompts based on findings

**Acceptance:** Pilot courses render correctly with new structure. Total blocks per course in 50-65 range. Block type variety matches targets. Quizzes appear throughout, not just at end.

---

## Stage 5: Full Rollout

**Goal:** Regenerate all content and clean up old system.

### Task 5.1: Regenerate all modules
- Run generation pipeline for all 942 modules
- Validate output against pacing rules (automated checks)
- Flag modules that fail validation for manual review

### Task 5.2: Remove old assembly code
- Remove source-first flatten logic
- Remove industry module loading (if decided to kill)
- Clean up old template files

### Task 5.3: Update tests
- Update/add tests for new assembly logic
- Test graceful degradation paths
- Test paywall placement across different data availability scenarios

**Acceptance:** All courses render with new structure. No regressions. Old code removed.
