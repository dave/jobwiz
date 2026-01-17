# Issue #22: Stripe payment integration

**Dependencies:** #21 (Auth) - user must be logged in to purchase, #10 (PaywallGate) - triggers checkout

## Acceptance Criteria

### Checkout Flow (#37)
- [ ] PaywallGate "Buy" button creates Stripe Checkout session
- [ ] Checkout session includes: company, role, user_id in metadata
- [ ] Redirects to Stripe-hosted checkout (~$200 one-time payment)
- [ ] Success redirect returns to journey + unlocks content
- [ ] Cancel redirect returns to paywall step

### Webhook Handling (#38)
- [ ] `checkout.session.completed` processed
- [ ] Webhook signature verified (Stripe signing secret)
- [ ] Idempotent (duplicate events don't create duplicate records)
- [ ] Errors logged with context (session_id, user_id)

### Purchase Records (#40)
- [ ] `purchases` table: id, user_id, stripe_session_id, amount, company, role, created_at
- [ ] `access_grants` table: id, user_id, company, role, granted_at
- [ ] Access checked via RLS (user can only see own grants)
- [ ] PaywallGate checks access_grants to show/hide content

### Pricing Structure (#39)
- [ ] Single Stripe product: "Interview Prep - {Company} {Role}"
- [ ] Price: ~$200 (configurable via env var for AB testing)
- [ ] Product metadata: company_slug, role_slug

> **Note:** Bundles deferred to post-MVP. Keep pricing simple.

### Mock Mode
- [ ] `STRIPE_MOCK_MODE=true` env var enables mock
- [ ] Mock purchase: skips Stripe, creates access_grant directly
- [ ] Mock checkout button shows "(Test Mode)" indicator
- [ ] Same unlock flow as real payments

---

## Testing Criteria

### Checkout Tests

```typescript
describe('Stripe Checkout', () => {
  test('creates checkout session with correct product')
  test('includes company/role/user_id in metadata')
  test('success redirect includes session_id')
  test('cancel redirect returns to paywall step')
  test('requires authenticated user to create session')
})
```

### Webhook Tests

```typescript
describe('Stripe webhooks', () => {
  test('verifies webhook signature')
  test('creates purchase record on session.completed')
  test('creates access_grant for company/role')
  test('handles duplicate events idempotently')
  test('rejects invalid signatures')
})
```

### Mock Mode Tests

```typescript
describe('Mock payment', () => {
  test('mock purchase creates access_grant')
  test('mock mode skips Stripe API calls')
})
```

```bash
# Test webhooks with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
# Should create purchase record
```

---

## Sub-issues

- [ ] #37 - Stripe Checkout implementation
- [ ] #38 - Stripe webhook handlers
- [ ] #39 - Flexible pricing structure
- [ ] #40 - Purchase unlock flow

---

## Definition of Done

1. Checkout flow works end-to-end (paywall → auth → Stripe → unlock)
2. Webhooks process successfully and create access_grants
3. PaywallGate checks access_grants and shows content when purchased
4. Mock mode works for development
5. All sub-issues completed
