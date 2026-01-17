# Issue #11: Prompts for company module generation

## Acceptance Criteria

### Prompt Templates
- [ ] `company-culture-prompt.md` template exists
- [ ] `company-interview-stages-prompt.md` template exists
- [ ] `company-tips-prompt.md` template exists
- [ ] `company-trivia-prompt.md` template exists

### Input Handling
- [ ] Prompts accept Glassdoor review data as input
- [ ] Prompts accept Reddit thread data as input
- [ ] Prompts handle missing/sparse data gracefully

### Output Format
- [ ] Output matches Module type schema from #6
- [ ] Output is valid JSON
- [ ] Output includes all required fields

### Quality Requirements
- [ ] No "In conclusion..." or similar AI phrases
- [ ] Conversational, not robotic tone
- [ ] Company-specific (not generic)

---

## Testing Criteria

### Validation Script

```bash
# Run prompt with sample data, validate output
npm run validate-prompt -- --prompt=company-culture --input=samples/google.json
# Exit code: 0
# Output: Valid JSON matching Module schema
```

### Output Validation

```typescript
describe('Company prompt output', () => {
  test('output is valid JSON')
  test('output matches Module schema')
  test('output contains company-specific content')
  test('output has no AI-sounding phrases')
})
```

### Sample Generation Test

```bash
# Generate module for sample company
npm run generate-module -- --type=company --company=google --dry-run
# Output saved to: output/company-google-preview.json
```

---

## Definition of Done

1. 4 prompt templates created and documented
2. Prompts produce valid Module-schema output
3. Sample outputs for 2 companies reviewed and approved
4. No obvious AI-generated phrasing detected
