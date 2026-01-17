# Issue #10: Paywall gate component

## Acceptance Criteria

### Gate Component
- [ ] `PaywallGate` component blocks content access
- [ ] Shows compelling copy about premium content
- [ ] Displays price (configurable)
- [ ] "Buy Now" / "Unlock" CTA button
- [ ] Optional: preview/teaser of locked content

### Gate Variants (for AB testing)
- [ ] Hard gate: completely blocks, must pay
- [ ] Soft gate: shows blurred preview, then blocks
- [ ] Teaser gate: shows first paragraph, then blocks
- [ ] Configurable via props

### Mock Mode
- [ ] Works without real Stripe integration
- [ ] "Buy" triggers mock success flow
- [ ] Unlocks content in localStorage/state
- [ ] Easy toggle between mock and real mode

### Integration
- [ ] Integrates with journey state
- [ ] Paywall position configurable (after step X, percentage, etc.)
- [ ] Tracks paywall impressions (for analytics)
- [ ] Tracks CTA clicks (for analytics)

### Unlock Flow
- [ ] After purchase (mock or real), content unlocks immediately
- [ ] Unlocked state persists across page refreshes
- [ ] Unlocked state tied to user account (when logged in)

---

## Testing Criteria

### Unit Tests

```typescript
describe('PaywallGate', () => {
  test('renders gate with CTA')
  test('shows price')
  test('clicking CTA calls onPurchase')
  test('soft variant shows blurred preview')
  test('teaser variant shows partial content')
})

describe('PaywallGate mock mode', () => {
  test('mock purchase triggers onUnlock')
  test('stores unlock state in localStorage')
  test('does not call Stripe in mock mode')
})
```

```bash
npm test -- --testPathPattern=paywall
# All tests pass
```

### Integration Tests

```typescript
describe('Paywall in journey', () => {
  test('shows paywall at configured step', async () => {
    render(<Journey config={{ paywallAfterStep: 2 }} />)

    // Navigate past step 2
    await clickNext()
    await clickNext()

    // Should see paywall
    expect(screen.getByText(/unlock/i)).toBeVisible()
  })

  test('unlocking removes paywall', async () => {
    render(<Journey config={{ paywallAfterStep: 2 }} />)
    await navigateToPaywall()

    // Mock unlock
    await userEvent.click(screen.getByRole('button', { name: /buy/i }))

    // Paywall should be gone, content visible
    expect(screen.queryByText(/unlock/i)).not.toBeInTheDocument()
    expect(screen.getByText('Step 3 content')).toBeVisible()
  })
})
```

### Persistence Test

```typescript
test('unlock persists across refresh', async () => {
  const { unmount } = render(<Journey />)
  await navigateToPaywall()
  await userEvent.click(screen.getByRole('button', { name: /buy/i }))
  unmount()

  // Re-render (simulates refresh)
  render(<Journey />)
  await navigateToStep(3)

  // Should not see paywall
  expect(screen.queryByText(/unlock/i)).not.toBeInTheDocument()
})
```

### Analytics Events Test

```typescript
test('tracks paywall impression', () => {
  const trackEvent = jest.fn()
  render(<PaywallGate onTrack={trackEvent} />)

  expect(trackEvent).toHaveBeenCalledWith('paywall_impression', expect.any(Object))
})

test('tracks CTA click', async () => {
  const trackEvent = jest.fn()
  render(<PaywallGate onTrack={trackEvent} />)

  await userEvent.click(screen.getByRole('button', { name: /buy/i }))

  expect(trackEvent).toHaveBeenCalledWith('paywall_cta_click', expect.any(Object))
})
```

### AB Variant Selection Tests

```typescript
describe('Paywall AB variants', () => {
  test('reads variant from AB context/provider', () => {
    render(
      <ABTestProvider experiments={{ paywall: 'soft' }}>
        <PaywallGate />
      </ABTestProvider>
    )
    // Soft variant shows blurred preview
    expect(screen.getByTestId('blurred-preview')).toBeVisible()
  })

  test('defaults to hard gate when no AB variant set', () => {
    render(<PaywallGate />)
    // Hard variant completely blocks
    expect(screen.queryByTestId('blurred-preview')).not.toBeInTheDocument()
  })

  test('variant is consistent for same user across sessions', () => {
    // Variant assignment should be deterministic based on user ID
    const getVariant = (userId: string) => assignVariant('paywall', userId)
    expect(getVariant('user-123')).toBe(getVariant('user-123'))
  })

  test('tracks variant in analytics events', () => {
    const trackEvent = jest.fn()
    render(
      <ABTestProvider experiments={{ paywall: 'teaser' }}>
        <PaywallGate onTrack={trackEvent} />
      </ABTestProvider>
    )
    expect(trackEvent).toHaveBeenCalledWith('paywall_impression', {
      variant: 'teaser',
      // ...other properties
    })
  })
})
```

> **Note:** Depends on #24 (AB Testing Framework) for `ABTestProvider` and `assignVariant`.

---

## Definition of Done

1. PaywallGate renders and blocks content
2. Mock purchase flow works end-to-end
3. Unlock state persists to localStorage
4. Gate variants (hard/soft/teaser) work
5. Analytics events fire correctly
6. Integration with journey works at configurable position
