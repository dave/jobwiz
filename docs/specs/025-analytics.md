# Issue #25: Analytics setup (PostHog)

## Acceptance Criteria

### PostHog Integration
- [ ] PostHog JS SDK installed
- [ ] Initialized on app load
- [ ] Project configured in PostHog dashboard

### Events Tracked
- [ ] `page_view` - with company, role
- [ ] `journey_step_complete` - step index, company, role
- [ ] `paywall_impression` - variant
- [ ] `cta_click` - button type, location
- [ ] `checkout_started` - product, company, role
- [ ] `purchase_complete` - product, amount, company, role

### User Identification
- [ ] Anonymous users tracked with distinct_id
- [ ] Identified users linked to Supabase user_id
- [ ] Properties: target_company, target_role

### UTM Attribution
- [ ] UTM params captured on first visit
- [ ] Stored as user properties
- [ ] Included in conversion events

### Privacy
- [ ] Cookie consent banner shown
- [ ] Tracking respects consent choice
- [ ] Anonymization option available

---

## Testing Criteria

### Event Tests

```typescript
describe('Analytics events', () => {
  test('page view fires on navigation')
  test('journey step fires on completion')
  test('paywall impression fires when shown')
  test('purchase event includes product details')
})
```

### Identification Tests

```typescript
describe('User identification', () => {
  test('anonymous user has distinct_id')
  test('identify() links user_id after login')
  test('UTM params stored as user properties')
})
```

### Consent Tests

```typescript
describe('Cookie consent', () => {
  test('banner shown on first visit')
  test('accepting consent enables tracking')
  test('rejecting consent disables tracking')
  test('preference persists')
})
```

```bash
# Verify in PostHog dashboard
# Events > page_view should show recent events
# Users > should show identified users
```

---

## Definition of Done

1. PostHog SDK integrated
2. All key events tracked
3. User identification works
4. Cookie consent implemented
5. Dashboard shows data
