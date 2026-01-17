# Issue #5: Google Trends API for search volume

## Acceptance Criteria

### 1. Script Structure
- [ ] `scripts/trends/` directory exists
- [ ] `fetch_trends.py` main script
- [ ] `requirements.txt` with dependencies
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
- [ ] Rate limiting (delays between requests)
- [ ] Progress saving (can resume if interrupted)
- [ ] Outputs to JSON file

### 4. Output Data Requirements
- [ ] Valid JSON file
- [ ] Contains `generated_at` timestamp
- [ ] Contains `geography` (US)
- [ ] Contains `status` field
- [ ] All companies have `slug` (lowercase, hyphenated)
- [ ] All companies have `interview_volume` (numeric)
- [ ] Each company has role data with `volume` scores
- [ ] `priority_list` sorted by score descending

---

## Testing Criteria

### Script Execution Test
```bash
cd scripts/trends
source venv/bin/activate

# Test run with subset
python fetch_trends.py --companies 3 --roles 2
# Exit code: 0
# Output file created
```

### Output Validation
```bash
# Check JSON is valid
cat ../output/search_volume.json | python -m json.tool > /dev/null
# Exit code: 0

# Check required fields exist
python -c "
import json
with open('../output/search_volume.json') as f:
    data = json.load(f)
assert 'generated_at' in data
assert 'geography' in data
assert 'companies' in data
assert 'priority_list' in data
assert len(data['companies']) > 0
print('All required fields present')
"
```

### Data Quality Tests
```bash
python -c "
import json
with open('../output/search_volume.json') as f:
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
# Start a run
python fetch_trends.py --companies 5 --roles 2 &
PID=$!

# Kill it after 30 seconds
sleep 30 && kill $PID

# Check partial output exists
test -f ../output/search_volume.json && echo "Progress file exists"

# Resume should continue from where it left off
python fetch_trends.py --companies 5 --roles 2 --resume
# Should skip already-processed companies
```

---

## Definition of Done

1. Script runs without errors (test run with --companies 3)
2. Output JSON is valid and contains all required fields
3. All data quality checks pass
4. Resume functionality works
5. Full run completes with 100+ companies (or documented why not)
