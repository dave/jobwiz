# Issue #22: Stripe payment integration

## Acceptance Criteria

### Checkout Flow
- [ ] "Buy" button creates Stripe Checkout session
- [ ] Redirects to Stripe-hosted checkout
- [ ] Success redirect unlocks content
- [ ] Cancel redirect returns to page

### Webhook Handling
- [ ] `checkout.session.completed` processed
- [ ] Webhook signature verified
- [ ] Idempotent (handles duplicate events)
- [ ] Errors logged

### Purchase Records
- [ ] `purchases` table stores completed purchases
- [ ] `access_grants` table stores content access
- [ ] Access checked via RLS

### Pricing Structure
- [ ] Supports single company/role purchase
- [ ] Supports bundles (for AB testing)
- [ ] Product metadata maps to access scope

### Mock Mode
- [ ] Works without real Stripe in development
- [ ] Mock purchase triggers same unlock flow
- [ ] Easy toggle between mock and real

---

## Testing Criteria

### Checkout Tests

```typescript
describe('Stripe Checkout', () => {
  test('creates checkout session with correct product')
  test('includes company/role in metadata')
  test('success redirect includes session_id')
  test('cancel redirect returns to landing page')
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

1. Checkout flow works end-to-end
2. Webhooks process successfully
3. Purchase unlocks content
4. Mock mode works for development
5. All sub-issues completed
