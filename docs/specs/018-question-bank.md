# Issue #18: Build question bank per position

## Acceptance Criteria

### Question Coverage
- [ ] 20-50 questions per company/role combination
- [ ] Psychology explanations included (from #13)
- [ ] Categorized by type: behavioral, technical, culture, curveball
- [ ] Difficulty ratings: easy, medium, hard

### Supabase Schema
- [ ] `questions` table exists
- [ ] Fields: company_id, role_id, question_text, category, difficulty
- [ ] Fields: interviewer_intent, good_answer_traits, common_mistakes
- [ ] Tags for filtering (stage, type, difficulty)
- [ ] Full-text search enabled
- [ ] Row-level security for premium content

### Question Types
- [ ] "Tell me about yourself" variations
- [ ] Behavioral/STAR questions
- [ ] Role-specific technical questions
- [ ] Company culture fit questions
- [ ] "Why this company?" variations

---

## Testing Criteria

### Schema Tests

```typescript
describe('Questions table', () => {
  test('can insert question with all fields')
  test('full-text search returns relevant questions')
  test('filters by category work')
  test('filters by difficulty work')
  test('RLS blocks premium content for free users')
})
```

### CLI Test

```bash
# Generate questions for company/role
npm run generate-questions -- --company=google --role=swe --count=25
# Output: 25 questions stored in Supabase

# Verify
npm run query-questions -- --company=google --role=swe --category=behavioral
# Output: List of behavioral questions for Google SWE
```

### Coverage Check

```sql
SELECT company_id, role_id, COUNT(*) as question_count
FROM questions
GROUP BY company_id, role_id
HAVING COUNT(*) >= 20;
-- Each company/role should have 20+ questions
```

---

## Definition of Done

1. Supabase schema created with all fields
2. Full-text search works
3. Questions generated for at least 5 company/role combos
4. RLS configured for premium gating
5. Unit tests pass
