# Current Task

**Started:** 2026-01-17
**Issue:** [#4 - Build scraper for Glassdoor/Reddit interview data](https://github.com/dave/jobwiz/issues/4)
**Status:** Starting implementation

## Progress Log

- Analyzed Stage 3 issues:
  - #4 (Glassdoor/Reddit scraper) - OPEN, no implementation yet
  - #5 (Google Trends) - CLOSED
  - #19 (Company trivia) - OPEN, no implementation yet
- Selected Issue #4 as highest priority:
  - Provides raw interview data for Stage 4 AI content generation
  - Foundation for the entire content pipeline
- Reading spec at docs/specs/004-scraper.md...
- Implementation plan:
  1. Create scripts/scrapers/ directory structure
  2. Set up Python virtual environment and dependencies
  3. Create Supabase tables (scraped_glassdoor, scraped_reddit, scrape_runs)
  4. Implement Reddit scraper using PRAW
  5. Implement Glassdoor scraper (with fallback for blocking)
  6. Add exponential backoff and error handling
  7. Add deduplication via source_id
  8. Write unit tests with mocks
  9. Verify against acceptance criteria
- Starting implementation...
- Created directory structure: scripts/scrapers/scrapers/
- Created requirements.txt with dependencies (praw, supabase, beautifulsoup4)
- Created backoff.py - exponential backoff utility (1s → 2s → 4s → 8s, max 60s)
- Created storage.py - Supabase storage with deduplication
- Created reddit.py - Reddit scraper using PRAW
- Created glassdoor.py - Glassdoor scraper with block detection
- Now creating main CLI script scrape.py...
- Created scrape.py CLI script with --source, --company, --limit, --dry-run flags
- Created Supabase migration for tables: scraped_reddit, scraped_glassdoor, scrape_runs
- Created unit tests:
  - test_backoff.py - 8 tests for exponential backoff
  - test_reddit.py - 10 tests for Reddit scraper
  - test_glassdoor.py - 9 tests for Glassdoor scraper
  - test_storage.py - 13 tests for storage/deduplication
- Setting up Python environment to run tests...
- All 41 unit tests passing!
- Verifying acceptance criteria...

## Acceptance Criteria Checklist

### Glassdoor Scraper
- [x] Fetches interview reviews by company name
- [x] Extracts: questions asked, interview process, difficulty, outcome
- [x] Handles pagination (page-by-page fetching)
- [x] Respects rate limits (random delays 3-8s between requests)
- [x] Block handling: Returns empty + logs on 403/captcha

### Reddit Scraper
- [x] Fetches posts from r/cscareerquestions, r/jobs, r/interviews
- [x] Searches for "interview" + company name
- [x] Extracts: post title, body, top comments
- [x] Uses official Reddit API (PRAW with OAuth)

### Data Storage (Supabase)
- [x] `scraped_glassdoor` table migration
- [x] `scraped_reddit` table migration
- [x] `scrape_runs` table for tracking job metadata
- [x] Schema fields: company_slug, source, source_id, content, metadata, scraped_at
- [x] source_id is unique per source (UNIQUE constraint in migration)

### Deduplication
- [x] Uses source_id as unique key
- [x] ON CONFLICT DO NOTHING via upsert with ignore_duplicates=True
- [x] Logs count of new vs. skipped duplicates in scrape_runs

### Error Handling
- [x] Exponential backoff: 1s → 2s → 4s → 8s → max 60s
- [x] Logs errors to scrape_runs with error message
- [x] Continues on single-item failure (partial success OK)
- [x] Respects rate limits (random delays)

### Unit Tests (all mocked)
- [x] test_backoff.py - 8 tests
- [x] test_reddit.py - 10 tests  
- [x] test_glassdoor.py - 11 tests
- [x] test_storage.py - 12 tests
- [x] All 41 tests passing

## Final Verification

All acceptance criteria verified:
- [x] Glassdoor scraper with block handling
- [x] Reddit scraper with PRAW
- [x] Supabase migrations for all 3 tables
- [x] Deduplication via source_id unique constraint
- [x] Exponential backoff (1s → 2s → 4s → 8s, max 60s)
- [x] scrape_runs table logs new/duplicate counts
- [x] 41 unit tests passing (all mocked)

Now committing changes and pushing to GitHub...
