# Human Review Checklist for Generated Content

Use this checklist when reviewing AI-generated content for quality.

## Review Criteria

### 1. Tone & Voice
- [ ] **Conversational** - Reads naturally, not robotic or formal
- [ ] **Confident but not arrogant** - Gives advice without being preachy
- [ ] **No AI-sounding phrases** - Avoids "In conclusion", "Let's dive in", "First and foremost"
- [ ] **Consistent voice** - Same tone throughout the module

### 2. Accuracy
- [ ] **Company facts verified** - Founding year, HQ, CEO, employee count are correct
- [ ] **Interview process accurate** - Number of rounds, format matches current reality
- [ ] **Culture claims supported** - Values and culture points align with Glassdoor/Reddit data
- [ ] **No outdated info** - No references to old CEOs, products, or policies

### 3. Specificity
- [ ] **Company-specific content** - Not generic advice that applies to any company
- [ ] **Role-specific content** - PM content differs from SWE content
- [ ] **Concrete examples** - Includes real scenarios, not vague generalizations
- [ ] **Actionable tips** - Reader knows exactly what to do

### 4. Structure & Flow
- [ ] **Logical progression** - Content builds on itself
- [ ] **Appropriate length** - Not too verbose, not too thin
- [ ] **Clear headings** - Sections are well-labeled
- [ ] **Varied formats** - Mix of text, tips, quizzes, checklists

### 5. Psychology & Depth
- [ ] **Explains the "why"** - Tells reader what interviewer is looking for
- [ ] **Teaches thinking** - Not just sample answers, but frameworks
- [ ] **Addresses mistakes** - Common pitfalls are mentioned
- [ ] **Builds confidence** - Encouraging without being dismissive of difficulty

## Pass/Fail Criteria

### PASS if:
- All accuracy items pass (hard requirement)
- At least 80% of other items pass
- No major tone/voice issues

### FAIL if:
- Any factual error found
- More than 3 AI-sounding phrases
- Content is generic (not company/role specific)
- Severely poor readability

## Flagging for Issues

When reviewing, note specific issues:

| Issue Type | How to Flag |
|------------|-------------|
| Factual error | `[FACT]` + correct information |
| AI phrase | `[AI]` + the phrase |
| Generic content | `[GENERIC]` + suggestion |
| Unclear | `[UNCLEAR]` + what's confusing |
| Missing info | `[MISSING]` + what's needed |

## Sample Review Format

```markdown
## Module: company-google
## Reviewer: [name]
## Date: [date]

### Summary
- Status: PASS / FAIL
- Issues Found: X
- Time Spent: X min

### Issues
1. [FACT] CEO listed as Sundar Pichai, but he's Alphabet CEO - correct to "Google CEO"
2. [AI] "Let's dive into" in section 2 intro
3. [GENERIC] Interview tips section could apply to any tech company

### Notes
Overall quality is good. Culture section is excellent.
```

## Priority Order for Review

1. **High Priority** - Content flagged by automated checks
2. **Medium Priority** - New companies (first module for that company)
3. **Low Priority** - Random sample of passing content
