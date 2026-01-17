# Issue #24: AB test infrastructure

**Dependencies:** #25 (Analytics) - PostHog for event tracking

## Acceptance Criteria

### User Bucketing (#41)
- [ ] Stable user ID: cookie for anonymous, user_id for logged in
- [ ] Deterministic variant assignment (hash-based on user_id + experiment_name)
- [ ] Same user always gets same variant
- [ ] Sticky bucketing persists to localStorage + Supabase (when logged in)

### Variant Assignment (#42)
- [ ] `getVariant(experimentName, userId)` utility function
- [ ] Variant stored in `variant_assignments` table (user_id, experiment, variant, assigned_at)
- [ ] Traffic split: 25% per variant (hardcoded for MVP)
- [ ] Variant passed to PaywallGate component via context/props

> **Note:** Full experiment configuration UI deferred. MVP uses code-defined experiments.

### Conversion Tracking (#43)
- [ ] All PostHog events include `$set: { paywall_variant: 'xxx' }`
- [ ] `purchase_complete` event includes variant for attribution
- [ ] Events tracked: `paywall_impression`, `paywall_cta_click`, `purchase_complete`

### Dashboard (#44)
- [ ] Use PostHog's built-in Funnels for analysis (no custom dashboard for MVP)
- [ ] Document how to view conversion by variant in PostHog
- [ ] Funnel: landing_view → paywall_impression → purchase_complete

> **Note:** Statistical significance calculated in PostHog. Custom dashboard deferred.

### Paywall Variants
- [ ] `direct_paywall` - immediate paywall, no free content
- [ ] `freemium` - general content free, company-specific paywalled
- [ ] `teaser` - shows blurred preview of locked content
- [ ] `question_limit` - N free questions, then paywall

---

## Testing Criteria

### Bucketing Tests

```typescript
describe('User bucketing', () => {
  test('generates stable anonymous ID from cookie')
  test('uses user_id when logged in')
  test('same user ID + experiment = same variant (deterministic)')
  test('variant persists to localStorage')
  test('variant syncs to Supabase when logged in')
})
```

### Variant Assignment Tests

```typescript
describe('getVariant', () => {
  test('returns consistent variant for same user+experiment')
  test('distributes roughly 25% per variant over many users')
  test('stores assignment in variant_assignments table')
  test('reads existing assignment instead of recalculating')
})
```

### Tracking Tests

```typescript
describe('Conversion tracking', () => {
  test('paywall_impression event includes variant')
  test('purchase_complete event includes variant')
  test('events set user property for variant')
})
```

### PostHog Integration

```bash
# Verify in PostHog dashboard:
# 1. Events → paywall_impression shows variant property
# 2. Funnels → can filter by paywall_variant
# 3. Users → variant appears in user properties
```

```bash
npm test -- --testPathPattern=ab
# All tests pass
```

---

## Sub-issues

- [ ] #41 - User bucketing system (stable ID generation)
- [ ] #42 - Variant assignment + storage (getVariant + variant_assignments table)
- [ ] #43 - Conversion tracking events (PostHog integration)
- [ ] #44 - AB test dashboard (PostHog funnel documentation)

---

## Definition of Done

1. Users consistently bucketed (same user = same variant)
2. PaywallGate renders correct variant based on assignment
3. All events include variant property
4. PostHog funnel shows conversion by variant
5. All sub-issues completed
