## Project Summary

Ace That Interview is an interview prep platform targeting job seekers at specific companies. Users search for something like "Google PM interview prep," land on a tailored page at `ace-that-interview.com/google/product-manager`, and get a guided prep course. Business model TBD via AB testing: either freemium (general content free, company-specific paywalled) or direct paywall (~$200 one-time).

Content is modular: general interview prep → company modules (culture, values) → role modules (PM, SWE) → combined courses. A matrix maps which modules apply to each company/role combo. This lets ~20 modules cover hundreds of positions. All content is AI-generated from public data (Glassdoor, Reddit), with prompts designed to explain the psychology—what interviewers *really* want, not just sample questions.

UX is story-based progressive disclosure (like Lemonade insurance signup): one step at a time, varied formats (video, audio, text, quotes, infographics, animations, multiple choice), with timeline showing full journey. No dashboard upfront—journey first. MVP is standalone (no resume/job upload). Voice integration and LinkedIn research are future phases.

**Dev approach:** Framework first, content later. Build the flexible UX/display system before generating content.

See GitHub issue #2 for the full plan: Research/Infrastructure → Content Framework → AI Content Pipeline → Data Collection → Launch.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
- Make sure each stage of the plan is separated, so we can run them stage by stage in separate contexts.
- When the plan is accepted, make a GitHub issue with the plan so we can load it later when we need to run stages. 

## Implementation

Use Context7 to check up-to-date docs when needed for implementing new libraries or frameworks, or adding features using them.