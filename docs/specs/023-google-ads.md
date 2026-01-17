# Issue #23: Google Ads campaign

## Status

⚠️ **Operational / Non-code task**
- Requires marketing budget allocation (TBD)
- Will be configured after launch prerequisites complete

**Dependencies:**
- #20 (Landing pages) - ads link to landing pages
- #24 (AB testing) - for conversion tracking integration
- #25 (Analytics) - for UTM parameter capture

---

## Acceptance Criteria

### Campaign Setup (Manual in Google Ads)
- [ ] Google Ads account created
- [ ] Conversion tracking pixel installed (from #43)
- [ ] Dynamic Search Ads campaign created
- [ ] Ad groups per company category

### Ad Copy
- [ ] Headlines generated for top 20 companies
- [ ] Descriptions written
- [ ] Ad extensions configured

### Targeting
- [ ] Keywords: "{company} interview prep"
- [ ] Keywords: "{company} {role} interview questions"
- [ ] Negative keywords: free, reddit, glassdoor
- [ ] Geographic: US, UK, AU initially

### Tracking
- [ ] UTM parameters on all landing page links
- [ ] Conversion tracking fires on purchase
- [ ] ROAS tracking configured

---

## Testing Criteria

### Pixel Verification

```bash
# Verify conversion pixel fires
# Open landing page in browser, make test purchase
# Check Google Ads > Conversions > shows test conversion
```

### UTM Tracking

```typescript
describe('UTM tracking', () => {
  test('ad landing preserves UTM params')
  test('purchase event includes UTM source')
  test('PostHog captures UTM attribution')
})
```

---

## Prerequisites

1. Landing pages live (#20)
2. Conversion tracking configured (#43)
3. Budget approved by stakeholder

---

## Definition of Done

1. Google Ads account configured
2. Conversion tracking verified
3. Initial campaigns launched
4. ROAS tracking working
