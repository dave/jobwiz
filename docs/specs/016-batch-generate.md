# Issue #16: Batch generate modules

## Acceptance Criteria

### Target Coverage
- [ ] Generates modules for top 100 companies (by search volume)
- [ ] Covers common roles: PM, SWE, Data Scientist, Marketing, Sales, Finance, Design
- [ ] Prioritizes by search volume from #5

### Pipeline Steps
- [ ] Runs scraper (#4) for each company
- [ ] Feeds data through company prompts (#11)
- [ ] Generates role Q&A (#13)
- [ ] Runs quality control (#15)
- [ ] Stores in Supabase

### Orchestration
- [ ] Content orchestration script (#30)
- [ ] Supabase content schema (#31)
- [ ] Priority queue system (#32)

---

## Testing Criteria

### End-to-End Test

```bash
# Generate module for single company (dry run)
npm run generate-batch -- --company=google --roles=swe,pm --dry-run
# Output: Preview of 2 modules (no database write)

# Generate module for single company (real)
npm run generate-batch -- --company=google --roles=swe
# Output: 1 module stored in Supabase
```

### Batch Test

```bash
# Generate for top 5 companies
npm run generate-batch -- --top=5 --roles=swe
# Output: 5 modules generated, stored in Supabase
```

### Database Verification

```sql
SELECT company, role, status FROM modules WHERE status = 'draft';
-- Should show generated modules
```

---

## Sub-issues

- [ ] #30 - Content orchestration script
- [ ] #31 - Supabase content storage schema
- [ ] #32 - Generation priority queue system

---

## Definition of Done

1. Pipeline generates modules end-to-end
2. At least 10 company modules generated as proof
3. Quality control passes on generated content
4. All sub-issues completed
