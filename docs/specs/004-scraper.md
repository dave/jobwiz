# Issue #4: Build scraper for Glassdoor/Reddit interview data

## Acceptance Criteria

### Glassdoor Scraper
- [ ] Fetches interview reviews by company name
- [ ] Extracts: questions asked, interview process, difficulty, outcome
- [ ] Handles pagination
- [ ] Respects rate limits

### Reddit Scraper
- [ ] Fetches posts from r/cscareerquestions, r/jobs
- [ ] Searches for "interview" + company name
- [ ] Extracts: post title, body, top comments
- [ ] Uses Reddit API or Pushshift

### Data Storage (Supabase)
- [ ] `scraped_glassdoor` table exists
- [ ] `scraped_reddit` table exists
- [ ] `scrape_runs` table for tracking
- [ ] Consistent schema: company, role, questions, tips, process

### Error Handling
- [ ] Rate limiting with backoff
- [ ] Logs errors to `scrape_runs`
- [ ] Continues on single-item failure

---

## Testing Criteria

### Scraper Tests

```typescript
describe('Glassdoor scraper', () => {
  test('fetches reviews for valid company')
  test('handles company not found')
  test('respects rate limits')
  test('stores data in Supabase')
})

describe('Reddit scraper', () => {
  test('fetches posts matching search')
  test('extracts post and comments')
  test('stores data in Supabase')
})
```

### CLI Test

```bash
# Run Glassdoor scraper for single company
npm run scrape -- --source=glassdoor --company=google --limit=10
# Output: 10 reviews stored in scraped_glassdoor

# Run Reddit scraper
npm run scrape -- --source=reddit --company=google --limit=20
# Output: 20 posts stored in scraped_reddit
```

### Database Verification

```sql
-- Verify data stored correctly
SELECT COUNT(*) FROM scraped_glassdoor WHERE company = 'google';
-- Should return > 0

SELECT COUNT(*) FROM scraped_reddit WHERE company = 'google';
-- Should return > 0
```

---

## Definition of Done

1. Glassdoor scraper fetches and stores reviews
2. Reddit scraper fetches and stores posts
3. Supabase tables created with correct schema
4. Rate limiting works (no bans)
5. Unit tests pass
