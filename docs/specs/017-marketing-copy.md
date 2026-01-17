# Issue #17: Generate marketing copy for each position

## Acceptance Criteria

### Batch Generation
- [ ] Generates landing page copy for each company/role combo
- [ ] Uses prompts from #12
- [ ] Prioritizes by search volume from #5

### Output Per Position
- [ ] Landing page copy (headline, subheadline, bullets)
- [ ] Meta tags for SEO
- [ ] OG tags for social sharing
- [ ] Multiple headline variations for AB testing (3+)
- [ ] Multiple CTA variations (3+)

### Storage
- [ ] `landing_copy` table in Supabase
- [ ] Fields: `company_slug`, `role_slug`, `copy_type`, `content`, `variation_id`
- [ ] All variations stored for AB testing retrieval

**Note:** Uses `company_slug`/`role_slug` strings, consistent with #4, #18, #19.

### Quality Requirements
- [ ] Company name appears in copy
- [ ] Role name appears in copy
- [ ] No generic/placeholder content
- [ ] Meta descriptions under 160 chars

---

## Testing Criteria

### CLI Test

```bash
# Generate copy for single position (dry run)
npm run generate-landing-copy -- --company=google --role=pm --dry-run
# Output: Preview of copy, no DB write

# Generate copy for single position
npm run generate-landing-copy -- --company=google --role=pm
# Output: Copy stored in Supabase with 3+ headline variations

# Batch mode
npm run generate-landing-copy -- --top=10 --roles=swe,pm
# Output: Copy generated for top 10 companies × 2 roles
```

### Validation Tests

```typescript
describe('Landing copy generation', () => {
  test('generates 3+ headline variations')
  test('generates 3+ CTA variations')
  test('includes company name in copy')
  test('includes role name in copy')
  test('meta description under 160 chars')
  test('stores all variations in Supabase')
})
```

### Database Verification

```sql
-- Check variations stored
SELECT company_slug, role_slug, copy_type, COUNT(*) as variation_count
FROM landing_copy
GROUP BY company_slug, role_slug, copy_type;
-- Each position should have 3+ headline variations

-- Check content quality
SELECT * FROM landing_copy
WHERE content NOT LIKE '%' || company_slug || '%';
-- Should return 0 rows (all copy mentions company)
```

---

## Definition of Done

1. Copy generated for at least 10 company/role combos
2. All positions have 3+ headline variations
3. All positions have SEO meta tags
4. Copy stored in Supabase with variation tracking
5. No generic/placeholder content detected
