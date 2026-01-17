# Issue #25: Analytics setup (PostHog)

**Used by:** #24 (AB testing) for conversion tracking, #23 (Google Ads) for UTM attribution

## Acceptance Criteria

### PostHog Integration
- [ ] PostHog JS SDK installed (`posthog-js`)
- [ ] Initialized on app load (via provider component)
- [ ] Project configured in PostHog dashboard
- [ ] API key in environment variables

### Events Tracked
- [ ] `page_view` - with company, role, url
- [ ] `journey_step_complete` - step_index, step_id, company, role
- [ ] `paywall_impression` - variant (from #24), company, role
- [ ] `paywall_cta_click` - variant, company, role
- [ ] `auth_started` - trigger (paywall, direct), company, role
- [ ] `auth_complete` - method (email, google), company, role
- [ ] `checkout_started` - product, company, role, amount
- [ ] `purchase_complete` - product, amount, company, role, variant

### User Identification
- [ ] Anonymous users tracked with PostHog's auto-generated distinct_id
- [ ] `posthog.identify(user_id)` called on auth
- [ ] User properties set: target_company, target_role, paywall_variant

### UTM Attribution
- [ ] UTM params captured on first visit (utm_source, utm_medium, utm_campaign)
- [ ] Stored as user properties via `$set_once`
- [ ] Included in conversion events for ROAS tracking

### Privacy (US Launch)
- [ ] No cookie consent banner required for US-only launch
- [ ] Add consent banner before EU expansion (deferred)
- [ ] PostHog configured with `disable_persistence: false` (default)

---

## Testing Criteria

### Event Tests

```typescript
describe('Analytics events', () => {
  test('page_view fires on navigation with company/role')
  test('journey_step_complete fires with step_index')
  test('paywall_impression includes variant')
  test('purchase_complete includes amount and variant')
})
```

### Identification Tests

```typescript
describe('User identification', () => {
  test('anonymous user has distinct_id')
  test('identify() called with user_id after login')
  test('user properties include target_company, target_role')
})
```

### UTM Tests

```typescript
describe('UTM attribution', () => {
  test('UTM params captured from URL on first visit')
  test('UTM stored as user properties via $set_once')
  test('subsequent visits do not overwrite UTM')
})
```

### AB Testing Integration

```typescript
describe('AB testing integration', () => {
  test('paywall_variant set as user property')
  test('all paywall events include variant')
  test('purchase event includes variant for attribution')
})
```

```bash
# Verify in PostHog dashboard:
# Events > filter by page_view, should show company/role
# Users > should show identified users with properties
# Funnels > can create funnel filtered by paywall_variant
```

---

## Definition of Done

1. PostHog SDK integrated and initialized
2. All key events tracked with correct properties
3. User identification works (anonymous → identified on auth)
4. UTM attribution captured and stored
5. AB test variant included in all relevant events
6. PostHog dashboard shows events and can filter by variant
