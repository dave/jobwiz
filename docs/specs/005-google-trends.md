# Issue #5: Google Trends API for search volume

**Note:** Google Trends has no official API. This script uses `pytrends`, an unofficial library that scrapes Google Trends. Rate limiting is essential to avoid blocks.

## Acceptance Criteria

### 1. Script Structure
- [ ] `scripts/trends/` directory exists
- [ ] `fetch_trends.py` main script
- [ ] `requirements.txt` with dependencies (pytrends, etc.)
- [ ] `companies.json` input file (100+ companies)
- [ ] `roles.json` input file (8+ roles)

### 2. Input Data Requirements
- [ ] Companies organized by category (tech, finance, consulting, etc.)
- [ ] At least 5 categories
- [ ] At least 100 total companies
- [ ] 8 common interview roles defined
- [ ] Each role has name and slug

### 3. Script Features
- [ ] Queries Google Trends for "{company} interview"
- [ ] Queries Google Trends for "{company} {role} interview"
- [ ] Rate limiting: 10-30 second delay between requests (pytrends gets blocked easily)
- [ ] Progress saving to `scripts/trends/progress.json` (can resume if interrupted)
- [ ] Outputs to `data/search_volume.json` in repo root

### 4. Block Handling
- [ ] Detects 429/block responses from Google
- [ ] On block: saves progress, logs warning, exits with code 2 (distinguishes from error)
- [ ] Resume flag (`--resume`) skips already-processed companies
- [ ] Logs: "Blocked by Google. Run again later with --resume to continue."

### 5. Output Data Requirements
- [ ] Valid JSON file
- [ ] Contains `generated_at` timestamp
- [ ] Contains `geography` (US)
- [ ] Contains `status` field (`complete`, `partial`, `blocked`)
- [ ] All companies have `slug` (lowercase, hyphenated)
- [ ] All companies have `interview_volume` (numeric)
- [ ] Each company has role data with `volume` scores
- [ ] `priority_list` sorted by score descending

---

## Testing Criteria

All paths are relative to repo root unless otherwise specified.

### Script Execution Test
```bash
cd scripts/trends
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Test run with small subset (slow due to rate limiting)
python fetch_trends.py --companies 3 --roles 2
# Exit code: 0 (complete) or 2 (blocked, partial data saved)
# Output: data/search_volume.json (repo root)
```

### Output Validation
```bash
# From repo root:
python -m json.tool data/search_volume.json > /dev/null
# Exit code: 0

python -c "
import json
with open('data/search_volume.json') as f:
    data = json.load(f)
assert 'generated_at' in data
assert 'geography' in data
assert 'status' in data  # 'complete', 'partial', or 'blocked'
assert 'companies' in data
assert 'priority_list' in data
assert len(data['companies']) > 0
print('All required fields present')
"
```

### Data Quality Tests
```bash
# From repo root:
python -c "
import json
with open('data/search_volume.json') as f:
    data = json.load(f)

# Check slugs are valid
for company in data['companies']:
    slug = company['slug']
    assert slug == slug.lower(), f'Slug not lowercase: {slug}'
    assert ' ' not in slug, f'Slug has spaces: {slug}'

# Check volumes are numeric
for company in data['companies']:
    assert isinstance(company['interview_volume'], (int, float))
    for role in company['roles']:
        assert isinstance(role['volume'], (int, float))

# Check priority list is sorted
scores = [p['score'] for p in data['priority_list']]
assert scores == sorted(scores, reverse=True), 'Priority list not sorted'

# Check no duplicate slugs
slugs = [c['slug'] for c in data['companies']]
assert len(slugs) == len(set(slugs)), 'Duplicate slugs found'

print('All data quality checks passed')
"
```

### Resume Capability Test
```bash
cd scripts/trends

# 1. Run with small subset
python fetch_trends.py --companies 2 --roles 1

# 2. Check progress file exists
test -f progress.json && echo "Progress file created"

# 3. Resume with more companies
python fetch_trends.py --companies 4 --roles 1 --resume
# Should log "Skipping {company} (already processed)" for first 2

# 4. Verify output has all companies
python -c "
import json
with open('../../data/search_volume.json') as f:
    data = json.load(f)
print(f'Total companies: {len(data[\"companies\"])}')
assert len(data['companies']) >= 4
"
```

### Block Handling Test
```bash
# Simulate or wait for a block, then verify:
# 1. Exit code is 2 (not 0 or 1)
# 2. progress.json contains processed companies
# 3. data/search_volume.json has status: "blocked" or "partial"
# 4. Running with --resume continues from last successful company
```

---

## Definition of Done

1. Script runs without errors (test run with --companies 3)
2. Output JSON valid with all required fields (including `status`)
3. All data quality checks pass
4. Resume functionality works (--resume skips processed companies)
5. Block handling works (exit code 2, progress saved, status: "blocked")
6. Full run completes with 100+ companies OR partial data with status: "partial"/"blocked"

## Integration Notes

The output file `data/search_volume.json` is used for:
- Prioritizing which company/role pages to build first
- Informing content creation priorities
- Market research for ad targeting

This data is committed to the repo and can be refreshed periodically.
