# Issue #19: Generate company trivia content

## Acceptance Criteria

### Data Points Per Company
- [ ] Founding date and founders
- [ ] Headquarters location
- [ ] Mission statement / company values
- [ ] Key products/services
- [ ] Company size (employees)
- [ ] Recent news highlights (last 12 months)

### Data Sources
- [ ] Company official websites (primary)
- [ ] Wikipedia API for structured data
- [ ] News APIs for recent developments
- [ ] Crunchbase (funding, acquisitions) - if accessible

### Content Formats
- [ ] Multiple choice quiz questions
- [ ] Flashcard-style Q&A pairs
- [ ] "Did you know?" factoids

### Storage
- [ ] `company_trivia` table in Supabase
- [ ] Fields: company_id, fact_type, question, answer, source_url
- [ ] Verification status (verified, unverified)

---

## Testing Criteria

### Trivia Generation

```bash
# Generate trivia for company
npm run generate-trivia -- --company=google
# Output: Trivia facts stored in Supabase

# Verify
npm run query-trivia -- --company=google --format=quiz
# Output: 10 multiple choice questions about Google
```

### Data Validation

```typescript
describe('Company trivia', () => {
  test('includes founding date')
  test('includes headquarters')
  test('includes mission statement')
  test('quiz format has 4 options')
  test('source URL is provided')
})
```

### Coverage Check

```sql
SELECT company_id, COUNT(*) as fact_count
FROM company_trivia
GROUP BY company_id;
-- Each company should have 10+ facts
```

---

## Definition of Done

1. Trivia generated for at least 10 companies
2. Multiple choice quiz format works
3. Source URLs included for verification
4. Data stored in Supabase
5. Unit tests pass
