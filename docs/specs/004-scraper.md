# Issue #4: Build scraper for Glassdoor/Reddit interview data

**Prerequisites:** #55 (Supabase setup) must be complete for database storage.

**Implementation:** Python scripts in `scripts/scrapers/`

## Acceptance Criteria

### Glassdoor Scraper
- [ ] Fetches interview reviews by company name
- [ ] Extracts: questions asked, interview process, difficulty, outcome
- [ ] Handles pagination
- [ ] Respects rate limits (exponential backoff)

**⚠️ Feasibility Note:** Glassdoor has aggressive anti-bot protection. Options:
1. Use browser automation (Playwright/Selenium) with delays
2. Use a third-party scraping API service
3. Manual data collection as fallback

If automated scraping proves unreliable, document blockers and pivot to alternative data sources.

### Reddit Scraper
- [ ] Fetches posts from r/cscareerquestions, r/jobs, r/interviews
- [ ] Searches for "interview" + company name
- [ ] Extracts: post title, body, top comments
- [ ] Uses official Reddit API (OAuth required)

**Note:** Pushshift is deprecated. Must use official Reddit API with registered app credentials.

### Data Storage (Supabase)
- [ ] `scraped_glassdoor` table exists
- [ ] `scraped_reddit` table exists
- [ ] `scrape_runs` table for tracking job metadata
- [ ] Schema fields: `company_slug`, `source`, `source_id`, `content`, `metadata`, `scraped_at`
- [ ] `source_id` is unique per source (prevents duplicate inserts)

**Note:** `role_slug` is intentionally omitted - Reddit posts often discuss general interview experiences without specific roles. Role extraction is done during content generation (Stage 4).

### Deduplication
- [ ] Uses `source_id` (e.g., Reddit post ID, Glassdoor review ID) as unique key
- [ ] `ON CONFLICT DO NOTHING` or upsert to handle re-scrapes gracefully
- [ ] Log count of new vs. skipped duplicates in `scrape_runs`

### Error Handling
- [ ] Exponential backoff: 1s → 2s → 4s → 8s → max 60s
- [ ] Logs errors to `scrape_runs` with error message
- [ ] Continues on single-item failure (partial success OK)
- [ ] Respects robots.txt and rate limit headers

---

## Testing Criteria

### Unit Tests (Mocked - run in CI)

```python
# scripts/scrapers/tests/test_scrapers.py

import pytest
from unittest.mock import Mock, patch

class TestRedditScraper:
    @patch('scrapers.reddit.praw.Reddit')
    def test_parses_valid_response(self, mock_reddit):
        """Should parse mocked Reddit API response correctly"""
        mock_reddit.return_value.subreddit.return_value.search.return_value = [
            Mock(id='abc123', title='Google interview', selftext='My experience...')
        ]
        result = scrape_reddit('google', limit=1)
        assert len(result) == 1
        assert result[0]['source_id'] == 'abc123'

    def test_handles_empty_results(self):
        """Should return empty list for no matches"""

    def test_extracts_comments(self):
        """Should include top comments in parsed results"""

    def test_builds_correct_search_query(self):
        """Should search for 'interview {company}'"""

class TestGlassdoorScraper:
    @patch('scrapers.glassdoor.requests.get')
    def test_parses_valid_html(self, mock_get):
        """Should extract review data from mocked HTML"""

    def test_handles_blocked_response(self):
        """Should return empty list and log warning on 403/captcha"""

class TestExponentialBackoff:
    def test_increases_delay_on_failure(self):
        """Backoff: 1s → 2s → 4s → 8s"""

    def test_caps_at_max_delay(self):
        """Should not exceed 60s delay"""

class TestDeduplication:
    def test_generates_unique_source_id(self):
        """source_id should be unique per post"""
```

### Integration Tests (Manual - requires credentials)

```bash
cd scripts/scrapers
source venv/bin/activate

# Reddit scraper (requires REDDIT_CLIENT_ID, REDDIT_SECRET)
python scrape.py --source=reddit --company=google --limit=5
# Expected: "Stored N posts (M new, K skipped duplicates)"

# Glassdoor scraper (may fail due to blocking)
python scrape.py --source=glassdoor --company=google --limit=5
# Expected: Success message OR documented failure reason

# Verify deduplication - run same command again
python scrape.py --source=reddit --company=google --limit=5
# Expected: "Stored 0 posts (0 new, 5 skipped duplicates)"
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

## Definition of Done

1. Reddit scraper fetches and stores posts successfully
2. Glassdoor scraper either works OR has documented blockers with fallback plan
3. Supabase tables created with correct schema (including `source_id` unique constraint)
4. Deduplication works - re-running scraper doesn't create duplicates
5. Rate limiting works (no bans during testing)
6. Unit tests pass (mocked, no external calls)
7. `scrape_runs` table logs all attempts with new/duplicate counts
