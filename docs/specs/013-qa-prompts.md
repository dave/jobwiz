# Issue #13: Prompts for Q&A with psychology

## Acceptance Criteria

### Prompt Templates
- [ ] `qa-behavioral-prompt.md` template exists
- [ ] `qa-technical-prompt.md` template exists
- [ ] `qa-culture-prompt.md` template exists
- [ ] `qa-curveball-prompt.md` template exists

### Output Structure Per Question
- [ ] Question text
- [ ] "What interviewer is really asking" explanation
- [ ] "What a good answer demonstrates" section
- [ ] "Common mistakes" list
- [ ] Answer framework (not scripted answer)

### Question Types Covered
- [ ] Behavioral (STAR method applicable)
- [ ] Technical (role-specific)
- [ ] Culture fit
- [ ] Curveball/stress questions

### Quality Requirements
- [ ] Explains psychology, not just answers
- [ ] Teaches thinking, not memorization
- [ ] Role and company-specific variations

---

## Testing Criteria

### Validation Script

```bash
# Generate Q&A for sample position
npm run generate-qa -- --company=google --role=swe --type=behavioral --dry-run
# Output saved to: output/qa-google-swe-behavioral.json
```

### Output Validation

```typescript
describe('Q&A prompt output', () => {
  test('each question has interviewer intent explanation')
  test('each question has good answer traits')
  test('each question has common mistakes')
  test('each question has framework, not scripted answer')
  test('output is role-specific')
})
```

### Psychology Check

```typescript
test('explains the why, not just the what', () => {
  const output = generateQA(sampleInput)
  // Should have "interviewer wants to see..." type explanations
  expect(output.questions[0].interviewerIntent).toBeTruthy()
  expect(output.questions[0].interviewerIntent.length).toBeGreaterThan(50)
})
```

---

## Definition of Done

1. 4 prompt templates created (behavioral, technical, culture, curveball)
2. Output includes psychology explanations for each question
3. Sample Q&A for 2 company/role combos reviewed
4. Content teaches thinking frameworks, not memorization
