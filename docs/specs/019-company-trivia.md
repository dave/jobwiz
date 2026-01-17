# Issue #19: Generate company trivia content

**Stage:** 3 (Data Collection)

**Prerequisites:**
- #55 (Supabase setup) - for database storage
- #5 (Google Trends) - uses `data/search_volume.json` to prioritize companies

**Implementation:** Python scripts in `scripts/trivia/`

## Overview

Generate company knowledge content for phone screen prep. Uses public APIs and AI to create quiz-style content that helps candidates demonstrate company knowledge during interviews.

---

## Acceptance Criteria

### 1. Data Points Per Company
- [ ] Founding date and founders
- [ ] Headquarters location
- [ ] Mission statement / company values
- [ ] Key products/services (top 3-5)
- [ ] Company size (employees, approximate)
- [ ] Recent news highlights (last 12 months)
- [ ] Notable executives (CEO, CTO, etc.)
- [ ] Recent acquisitions or milestones

### 2. Data Sources (priority order)
1. **Wikipedia API** - structured infobox data (founding, HQ, size)
2. **Company official websites** - mission, values, products
3. **News APIs** - recent developments (NewsAPI, Google News RSS)
4. **Crunchbase** - funding, acquisitions (if API accessible)
5. **SEC EDGAR** - for public companies (10-K filings)

**Note:** Start with Wikipedia + News APIs. Add other sources incrementally.

### 3. AI Generation
- [ ] Uses OpenAI/Claude API to transform raw facts into quiz format
- [ ] Prompt generates: question, correct answer, 3 wrong options, source
- [ ] Prompt ensures wrong options are plausible but clearly incorrect
- [ ] Each company gets 10-15 trivia items

### 4. Content Formats (per fact)
- [ ] `quiz` - Multiple choice (1 correct, 3 distractors)
- [ ] `flashcard` - Q&A pair for review
- [ ] `factoid` - "Did you know?" statement

### 5. Storage Schema (Supabase)

```sql
CREATE TABLE company_trivia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_slug TEXT NOT NULL,  -- matches search_volume.json
  fact_type TEXT NOT NULL,     -- founding, hq, mission, product, news, exec, acquisition
  format TEXT NOT NULL,        -- quiz, flashcard, factoid
  question TEXT,               -- for quiz/flashcard
  answer TEXT NOT NULL,        -- correct answer
  options JSONB,               -- for quiz: ["wrong1", "wrong2", "wrong3"]
  source_url TEXT,             -- where fact was sourced
  source_date DATE,            -- when fact was retrieved
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trivia_company ON company_trivia(company_slug);
CREATE INDEX idx_trivia_type ON company_trivia(fact_type);
```

**Note:** Uses `company_slug` (string FK) rather than `company_id` since the source of truth for companies is `data/search_volume.json`, not a database table.

---

## Testing Criteria

### Unit Tests (Mocked)

```python
# scripts/trivia/tests/test_trivia.py

class TestWikipediaFetcher:
    @patch('trivia.wikipedia.requests.get')
    def test_extracts_infobox_data(self, mock_get):
        """Should parse founding date, HQ from mocked Wikipedia response"""

    def test_handles_missing_company(self):
        """Should return None for unknown company"""

class TestQuizGenerator:
    @patch('trivia.generator.openai.chat.completions.create')
    def test_generates_quiz_format(self, mock_openai):
        """Should produce question with 4 options"""

    def test_quiz_has_one_correct_answer(self):
        """Correct answer should be in options exactly once"""

class TestTriviaStorage:
    def test_stores_with_source_url(self):
        """Should save source_url for verification"""

    def test_slug_matches_search_volume(self):
        """company_slug should match format in search_volume.json"""
```

### Integration Test (Manual)

```bash
cd scripts/trivia
source venv/bin/activate

# Generate trivia for single company
python generate.py --company=google --limit=5
# Expected: "Generated 5 trivia items for google"

# Verify in database
python -c "
from supabase import create_client
import os
client = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
result = client.table('company_trivia').select('*').eq('company_slug', 'google').execute()
print(f'Found {len(result.data)} trivia items for google')
for item in result.data[:3]:
    print(f'  - [{item[\"format\"]}] {item[\"question\"][:50]}...')
"
```

### Content Quality Checks

```python
# scripts/trivia/tests/test_quality.py

def test_quiz_has_four_options():
    """Each quiz item should have exactly 4 options"""

def test_answer_in_options():
    """Correct answer must appear in options list"""

def test_source_url_valid():
    """source_url should be a valid URL"""

def test_no_duplicate_questions():
    """Same question shouldn't appear twice for a company"""
```

### Database Verification

```sql
-- Check trivia coverage
SELECT company_slug, COUNT(*) as trivia_count
FROM company_trivia
GROUP BY company_slug
ORDER BY trivia_count DESC;
-- Each company should have 10+ items

-- Check format distribution
SELECT format, COUNT(*) FROM company_trivia GROUP BY format;
-- Should have mix of quiz, flashcard, factoid

-- Check fact type coverage
SELECT fact_type, COUNT(*) FROM company_trivia GROUP BY fact_type;
-- Should cover: founding, hq, mission, product, news, exec
```

---

## Definition of Done

1. Wikipedia fetcher extracts basic company facts
2. AI generates quiz format with plausible distractors
3. Trivia stored in Supabase with source URLs
4. At least 10 companies have 10+ trivia items each
5. Unit tests pass (mocked, no external calls)
6. `company_slug` values match `data/search_volume.json` format
