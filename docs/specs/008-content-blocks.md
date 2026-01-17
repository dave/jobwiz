# Issue #8: Content block component library

## Acceptance Criteria

### Block Components
- [ ] `VideoBlock` - YouTube/Vimeo embeds (#49)
- [ ] `AudioBlock` - audio player with controls (#50)
- [ ] `TextBlock` - text, header, quote, tip, warning variants (#51)
- [ ] `InfographicBlock` - images with zoom (#52)
- [ ] `AnimationBlock` - Lottie animations (#52)
- [ ] `QuizBlock` - multiple choice with feedback (#53)
- [ ] `ChecklistBlock` - checkable items with persistence (#54)

### BlockRenderer
- [ ] `BlockRenderer` component dispatches to correct block type
- [ ] Handles unknown block types gracefully (logs warning, renders null)

### Shared Features
- [ ] All blocks accept `onComplete` callback
- [ ] All blocks accept `theme` prop for company colors
- [ ] All interactive blocks track completion state

### VideoBlock (#49)
- [ ] Embeds YouTube videos
- [ ] Embeds Vimeo videos
- [ ] Calls `onComplete` at 80% watched

### AudioBlock (#50)
- [ ] Play/pause controls
- [ ] Seek bar
- [ ] Playback speed (0.5x, 1x, 1.5x, 2x)
- [ ] Calls `onComplete` at 90% listened

### TextBlock (#51)
- [ ] Renders markdown (bold, italic, links, lists)
- [ ] Visual distinction between types (text, header, quote, tip, warning)
- [ ] Tip: green background, icon
- [ ] Warning: yellow/red background, icon

### QuizBlock (#53)
- [ ] Displays question and options
- [ ] Single-select (radio) or multi-select (checkbox)
- [ ] Shows correct/incorrect feedback after submit
- [ ] Reveals explanation after submit
- [ ] Calls `onComplete` after submission

### ChecklistBlock (#54)
- [ ] Displays checkable items
- [ ] Persists checked state to localStorage
- [ ] Shows progress ("3 of 5 complete")
- [ ] Calls `onComplete` when all required items checked

---

## Testing Criteria

### Unit Tests (per component)

```typescript
describe('TextBlock', () => {
  test('renders paragraph type')
  test('renders header with correct tag (h2/h3)')
  test('renders markdown bold/italic')
  test('renders tip with icon')
  test('renders warning with icon')
  test('applies theme colors to quote border')
})

describe('QuizBlock', () => {
  test('renders question and options')
  test('submit disabled until selection made')
  test('shows correct feedback for right answer')
  test('shows incorrect feedback for wrong answer')
  test('reveals explanation after submit')
  test('calls onComplete after submit')
})

describe('ChecklistBlock', () => {
  test('renders all items as checkboxes')
  test('toggles checked state on click')
  test('shows progress count')
  test('persists to localStorage')
  test('calls onComplete when all required checked')
})
```

```bash
npm test -- --testPathPattern=blocks
# All tests pass
```

### BlockRenderer Test

```typescript
describe('BlockRenderer', () => {
  test('renders VideoBlock for type video')
  test('renders TextBlock for type text')
  test('renders QuizBlock for type quiz')
  test('returns null for unknown type')
  test('logs warning for unknown type')
})
```

### Accessibility Tests

```typescript
describe('Block accessibility', () => {
  test('TextBlock has no a11y violations')
  test('QuizBlock has no a11y violations')
  test('ChecklistBlock has no a11y violations')
  test('VideoBlock has accessible iframe title')
})
```

```bash
npm test -- --testPathPattern=a11y
# No violations
```

### Visual Regression (Storybook)

```bash
# Stories exist for all block types
npm run storybook
# Manual: check each block renders correctly
# Or: run Chromatic/Percy for automated visual tests
```

---

## Sub-issues

- #49 - Video player component
- #50 - Audio player component
- #51 - Text and quote blocks
- #52 - Infographic and animation components
- #53 - Multiple choice question component
- #54 - Checkbox/checklist component

---

## Definition of Done

1. All block components render without errors
2. Unit tests pass for each component
3. BlockRenderer correctly dispatches
4. Interactive blocks call onComplete
5. Accessibility tests pass
6. Storybook stories exist for all variants
