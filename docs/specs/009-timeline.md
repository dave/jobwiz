# Issue #9: Timeline/progress visualization

## Acceptance Criteria

### Timeline Component
- [ ] Displays all steps with titles
- [ ] Shows step state: completed, current, upcoming, locked
- [ ] Completed steps show checkmark icon
- [ ] Current step visually highlighted
- [ ] Locked/premium steps show lock icon
- [ ] Estimated time displayed per step (optional)

### Progress Bar
- [ ] Shows overall percentage complete
- [ ] Displays "X of Y steps" text
- [ ] Animates smoothly on progress change

### Interaction
- [ ] Click completed step → jumps to it
- [ ] Click upcoming step → jumps to it
- [ ] Click locked step → no action (or shows paywall hint)
- [ ] Click current step → no action

### Layout
- [ ] Vertical layout on mobile
- [ ] Collapsible on mobile (optional)
- [ ] Horizontal or vertical on desktop (configurable)

### Accessibility
- [ ] Uses semantic list markup (`<ul>`, `<li>`)
- [ ] Current step has `aria-current="step"`
- [ ] Completed/locked states announced to screen readers
- [ ] Keyboard navigable

---

## Testing Criteria

### Unit Tests

```typescript
describe('Timeline', () => {
  test('renders all steps')
  test('shows checkmark for completed steps')
  test('highlights current step')
  test('shows lock for premium steps')
  test('clicking completed step calls onStepClick')
  test('clicking locked step does not call onStepClick')
})

describe('ProgressBar', () => {
  test('shows correct percentage')
  test('shows "X of Y" text')
  test('aria-valuenow matches percentage')
})
```

```bash
npm test -- --testPathPattern=timeline
# All tests pass
```

### Accessibility Tests

```typescript
describe('Timeline accessibility', () => {
  test('has no a11y violations')
  test('uses list markup')
  test('current step has aria-current')
  test('progress bar has correct ARIA attributes')
})
```

### Visual States Test

```typescript
test('renders all visual states', () => {
  render(
    <Timeline
      steps={[
        { id: '1', title: 'Completed', ... },
        { id: '2', title: 'Current', ... },
        { id: '3', title: 'Upcoming', ... },
        { id: '4', title: 'Locked', isPremium: true },
      ]}
      currentIndex={1}
      completedSteps={new Set(['1'])}
    />
  )

  // Verify each state renders distinctly
  expect(screen.getByText('Completed').closest('li')).toHaveClass('completed')
  expect(screen.getByText('Current').closest('li')).toHaveClass('current')
  expect(screen.getByText('Locked').closest('li')).toHaveClass('locked')
})
```

### Responsive Test

```typescript
// Use matchMedia mock for responsive testing in jsdom
describe('Responsive layout', () => {
  test('renders vertical on mobile viewport', () => {
    // Mock mobile viewport via matchMedia
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))

    render(<Timeline steps={steps} />)
    const list = screen.getByRole('list')
    expect(list).toHaveClass('timeline--vertical')
  })

  test('renders horizontal on desktop viewport', () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(min-width: 769px)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))

    render(<Timeline steps={steps} orientation="horizontal" />)
    const list = screen.getByRole('list')
    expect(list).toHaveClass('timeline--horizontal')
  })
})
```

> **Note:** For true visual responsive testing, use Storybook + Chromatic or Playwright E2E tests separately.

---

## Definition of Done

1. Timeline renders all step states correctly
2. Click navigation works for allowed steps
3. Progress bar shows accurate percentage
4. Accessibility tests pass
5. Responsive layout works on mobile/desktop
