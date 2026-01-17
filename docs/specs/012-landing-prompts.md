# Issue #12: Prompts for landing page copy

## Acceptance Criteria

### Prompt Templates
- [ ] `landing-headline-prompt.md` template exists
- [ ] `landing-bullets-prompt.md` template exists
- [ ] `landing-cta-prompt.md` template exists
- [ ] `landing-meta-prompt.md` template exists

### Output Variations
- [ ] Generates 3+ headline variations per company/role
- [ ] Generates 3+ CTA variations for AB testing
- [ ] Generates SEO meta description

### Output Format
- [ ] Output is valid JSON
- [ ] Includes all required fields (headline, subheadline, bullets, cta, meta)

### Quality Requirements
- [ ] Company/role specific (not generic)
- [ ] No clickbait or sleazy urgency
- [ ] Highlights "insider knowledge" angle

---

## Testing Criteria

### Validation Script

```bash
# Generate landing copy for sample position
npm run generate-landing -- --company=google --role=pm --dry-run
# Output saved to: output/landing-google-pm-preview.json
```

### Output Validation

```typescript
describe('Landing copy output', () => {
  test('output is valid JSON')
  test('includes 3+ headline variations')
  test('includes 3+ CTA variations')
  test('meta description under 160 chars')
  test('content mentions company name')
  test('content mentions role')
})
```

---

## Definition of Done

1. 4 prompt templates created
2. Sample outputs for 3 company/role combos reviewed
3. Variations suitable for AB testing
4. Meta descriptions SEO-appropriate
