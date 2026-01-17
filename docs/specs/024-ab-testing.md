# Issue #24: AB test infrastructure

## Acceptance Criteria

### User Bucketing (#41)
- [ ] Stable user ID generated (cookie or user_id)
- [ ] Deterministic variant assignment (hash-based)
- [ ] Same user always gets same variant
- [ ] Sticky bucketing across sessions

### Experiment Configuration (#42)
- [ ] `experiments` table in Supabase
- [ ] `variant_assignments` table in Supabase
- [ ] Traffic split configurable (e.g., 25/25/25/25)
- [ ] Experiment status: draft, running, concluded

### Conversion Tracking (#43)
- [ ] Events logged to PostHog
- [ ] Events include variant assignment
- [ ] Purchase events tracked server-side

### Dashboard (#44)
- [ ] View conversion rate per variant
- [ ] Statistical significance indicator
- [ ] Date range filtering

### Paywall Variants
- [ ] A: direct_paywall
- [ ] B: freemium
- [ ] C: teaser
- [ ] D: question_limit

---

## Testing Criteria

### Bucketing Tests

```typescript
describe('User bucketing', () => {
  test('generates stable user ID')
  test('same user ID + experiment = same variant')
  test('variant persists across page loads')
  test('variant persists across sessions')
})
```

### Experiment Tests

```typescript
describe('Experiment management', () => {
  test('can create experiment with variants')
  test('can update traffic split')
  test('can conclude experiment')
  test('assignments respect traffic split')
})
```

### Tracking Tests

```typescript
describe('Conversion tracking', () => {
  test('page view includes variant')
  test('purchase event includes variant')
  test('events sent to PostHog')
})
```

```bash
npm test -- --testPathPattern=ab
# All tests pass
```

---

## Sub-issues

- [ ] #41 - User bucketing system
- [ ] #42 - Variant assignment + storage
- [ ] #43 - Conversion tracking events
- [ ] #44 - AB test dashboard

---

## Definition of Done

1. Users consistently bucketed
2. Variants render correctly
3. Conversion events tracked
4. Dashboard shows results
5. All sub-issues completed
