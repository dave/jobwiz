# Issue #15: Content quality control pipeline

## Acceptance Criteria

### Automated Checks
- [ ] Repetition detection script (#26)
- [ ] Readability scoring (#27)
- [ ] Company fact verification checklist (#28)

### Human Review
- [ ] Sampling workflow defined (#29)
- [ ] Review checklist document exists

### Pipeline Integration
- [ ] Quality checks run automatically on generated content
- [ ] Failed checks flag content for review
- [ ] Pass/fail status logged

---

## Testing Criteria

### Pipeline Run

```bash
# Run quality pipeline on sample content
npm run quality-check -- --input=output/company-google.json
# Output:
# - Repetition: PASS (0 duplicates)
# - Readability: PASS (score: 65)
# - Facts: REVIEW NEEDED (2 claims to verify)
```

### Automated Tests

```typescript
describe('Quality pipeline', () => {
  test('detects repeated phrases across modules')
  test('calculates readability score')
  test('flags factual claims for verification')
  test('returns overall pass/fail status')
})
```

---

## Sub-issues

- [ ] #26 - Repetition detection automation
- [ ] #27 - Readability scoring system
- [ ] #28 - Company fact verification checklist
- [ ] #29 - Human review sampling workflow

---

## Definition of Done

1. Automated checks run without errors
2. Sample content passes quality checks
3. Flagging system works for review items
4. All sub-issues completed
