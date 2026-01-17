# Issue #7: Step-based journey UI framework

## Acceptance Criteria

### Core Components
- [ ] `JourneyProvider` context component exists
- [ ] `useJourney()` hook available for child components
- [ ] `JourneyContainer` renders steps one at a time
- [ ] `StepNavigation` component with next/back buttons

### State Management (#45)
- [ ] Tracks current step index
- [ ] Tracks completed steps (Set of IDs)
- [ ] Stores answers from interactive elements
- [ ] Persists to localStorage for anonymous users
- [ ] Syncs to Supabase for logged-in users

### Navigation (#46)
- [ ] Next button advances to next step
- [ ] Back button returns to previous step
- [ ] First step hides back button
- [ ] Last step shows "Complete" instead of "Continue"
- [ ] Required steps block advancement until complete
- [ ] Keyboard: Enter advances, Escape goes back

### Config Schema (#47)
- [ ] `JourneyConfig` type defined
- [ ] Configs loadable from JSON/Supabase
- [ ] Supports paywall position configuration
- [ ] Supports step ordering and requirements

### Responsive Layout (#48)
- [ ] Mobile: full-screen steps, bottom navigation
- [ ] Desktop: larger content area
- [ ] Touch targets minimum 44px
- [ ] Smooth transitions between steps

---

## Testing Criteria

### Unit Tests

```typescript
// JourneyProvider tests
describe('useJourney', () => {
  test('initializes at step 0')
  test('nextStep increments index')
  test('prevStep decrements index')
  test('markComplete adds step to completed set')
  test('progress calculates correct percentage')
  test('canAdvance returns false for incomplete required step')
})
```

```bash
npm test -- --testPathPattern=journey
# All tests pass
```

### Component Tests

```typescript
describe('JourneyContainer', () => {
  test('renders current step content')
  test('shows next button')
  test('hides back button on first step')
  test('shows Complete on last step')
})

describe('StepNavigation', () => {
  test('calls onNext when next clicked')
  test('calls onPrev when back clicked')
  test('disables next when canAdvance is false')
})
```

### Integration Test

```typescript
test('complete journey flow', async () => {
  render(<JourneyContainer config={threeStepConfig} />)

  // Step 1
  expect(screen.getByText('Step 1')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: /continue/i }))

  // Step 2
  expect(screen.getByText('Step 2')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: /continue/i }))

  // Step 3 (last)
  expect(screen.getByText('Step 3')).toBeVisible()
  expect(screen.getByRole('button', { name: /complete/i })).toBeVisible()
})
```

### Persistence Test

```typescript
test('persists state to localStorage', async () => {
  render(<JourneyContainer config={config} />)
  await userEvent.click(screen.getByRole('button', { name: /continue/i }))

  const stored = JSON.parse(localStorage.getItem('journey-state')!)
  expect(stored.currentStepIndex).toBe(1)
})
```

### Keyboard Navigation Tests

```typescript
describe('Keyboard navigation', () => {
  test('Enter key advances to next step')
  test('Escape key returns to previous step')
  test('Escape on first step does nothing')
  test('Enter on incomplete required step does nothing')
})
```

### Supabase Sync Tests

```typescript
describe('State sync for logged-in users', () => {
  test('saves progress to Supabase when authenticated')
  test('loads progress from Supabase on mount')
  test('falls back to localStorage when unauthenticated')
  test('handles Supabase errors gracefully (continues with localStorage)')
})
```

### Accessibility Tests

```bash
# Run axe on journey page
npx jest --testPathPattern=a11y
# No violations
```

---

## Sub-issues

- #45 - Journey state management
- #46 - Step navigation logic
- #47 - Journey config schema
- #48 - Journey mobile responsive layout

---

## Definition of Done

1. All unit tests pass
2. Integration test completes full journey flow
3. State persists to localStorage
4. Mobile layout renders correctly (manual check or snapshot)
5. No accessibility violations
