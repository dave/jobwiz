# Issue #4: Build scraper for Reddit interview data

**Prerequisites:** #55 (Supabase setup) must be complete for database storage.

**Implementation:** Python scripts in `scripts/scrapers/`

## Acceptance Criteria

### Reddit Scraper
- [x] Fetches posts from r/cscareerquestions, r/jobs, r/interviews
- [x] Searches for "interview" + company name
- [x] Extracts: post title, body, top comments
- [x] Uses public JSON endpoints (no API key required)

**Note:** Uses `old.reddit.com/r/{sub}/search.json` - no OAuth or API registration needed. Rate limited to ~60 req/min.

### Data Storage (Supabase)
- [x] `scraped_reddit` table exists
- [x] `scrape_runs` table for tracking job metadata
- [x] Schema fields: `company_slug`, `source`, `source_id`, `content`, `metadata`, `scraped_at`
- [x] `source_id` is unique per source (prevents duplicate inserts)

**Note:** `role_slug` is intentionally omitted - Reddit posts often discuss general interview experiences without specific roles. Role extraction is done during content generation (Stage 4).

### Deduplication
- [x] Uses `source_id` (Reddit post ID) as unique key
- [x] `ON CONFLICT DO NOTHING` or upsert to handle re-scrapes gracefully
- [x] Log count of new vs. skipped duplicates in `scrape_runs`

### Error Handling
- [x] Exponential backoff: 1s → 2s → 4s → 8s → max 60s
- [x] Logs errors to `scrape_runs` with error message
- [x] Continues on single-item failure (partial success OK)
- [x] Rate limiting between requests

---

## Testing Criteria

### Unit Tests (Mocked - run in CI)

```bash
cd scripts/scrapers && pytest tests/ -v
```

Tests cover:
- Reddit JSON response parsing
- Empty result handling
- Comment extraction
- Search query building
- Multiple subreddit search
- Company slug normalization
- Error handling

### Integration Tests (Manual)

```bash
cd scripts/scrapers
source venv/bin/activate

# Reddit scraper (no credentials required!)
python scrape.py --source=reddit --company=google --limit=5
# Expected: "✓ REDDIT: X new, Y duplicates"

# Verify deduplication - run same command again
python scrape.py --source=reddit --company=google --limit=5
# Expected: "✓ REDDIT: 0 new, 5 duplicates"
```

### Database Verification

```sql
-- Verify data stored correctly
SELECT COUNT(*) FROM scraped_reddit WHERE company_slug = 'google';

-- Verify no duplicates exist
SELECT source_id, COUNT(*) FROM scraped_reddit
GROUP BY source_id HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Check scrape run logging
SELECT * FROM scrape_runs ORDER BY created_at DESC LIMIT 5;
```

---

## Verification Checklist (required before closing)

- [x] **Tables exist** - `scraped_reddit`, `scrape_runs` queryable
- [x] **Reddit scraper works** - stores data successfully
- [x] **Deduplication works** - second run shows 0 new
- [x] **Data queryable** - can retrieve stored posts
- [x] **Unit tests pass** - 44 tests passing

---

## Definition of Done

All verification checklist items checked with output pasted as issue comment. ✓ Complete
