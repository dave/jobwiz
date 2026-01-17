# JobWiz - Master Summary

## Product Vision
Interview prep platform targeting people who just got interviews at specific companies. One-time payment (~$200) for comprehensive prep materials.

## Business Model
- Google Ads for "[company] [role] interview prep"
- Company-specific landing pages with tailored branding
- Target: panicking job seekers willing to pay for an edge
- **Paywall: AB test** freemium vs direct paywall

## Content Architecture
```
                    ┌─────────────────┐
                    │ General Interview│
                    │     Skills       │ (potentially free)
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│   Company     │   │   Industry    │   │    Role       │
│   Modules     │   │   Modules     │   │   Modules     │
│ (Google, etc) │   │ (Pharma, etc) │   │ (PM, SWE)     │
└───────┬───────┘   └───────────────┘   └───────┬───────┘
        │                                        │
        └──────────────┬─────────────────────────┘
                       │
              ┌────────▼────────┐
              │ Combined Course │
              │ (Google PM, etc)│
              └─────────────────┘
```

## Key UX Decisions
1. **Journey-first**: Progressive disclosure, one step at a time (like Lemonade)
2. **Psychology focus**: Explain what interviewers really want, not just questions
3. **Variety**: Mix videos, audio, text, quotes, infographics, animations, multiple choice
4. **Timeline visibility**: Show full journey map upfront
5. **Standalone MVP**: No resume/job upload needed

## Dev Approach: Framework First
Build the flexible UX/display system BEFORE generating content. Framework must support all content block types.

## Content Block Types
- Video, audio, text, big quotes, infographics, animations, multiple choice, checkboxes

## Future Features
- LinkedIn research on interviewer for rapport-building
- Voice integration (research sesame.ai)
- Customizable interview stage templates

## Implementation Stages (see GitHub #2)
1. Research & Infrastructure
2. Content Framework (before content!)
3. AI Content Pipeline
4. Data Collection & Population
5. Launch
