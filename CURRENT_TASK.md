# Current Task

## Selected Issue: #48 - Journey mobile responsive layout
https://github.com/dave/jobwiz/issues/48

**Parent:** #7 (Journey UI)

**Analysis:**
- Stage 2 has 4 main issues: #7, #8, #9, #10
- Issue #7 has sub-issues: #45 (CLOSED), #46 (CLOSED), #47 (CLOSED), #48 (OPEN)
- #48 is the final sub-issue needed to complete #7
- This should be prioritized to close out the Journey UI parent issue

**Acceptance Criteria:**
- Mobile (<640px): full-screen steps, bottom navigation
- Tablet (640-1024px): similar to mobile or sidebar
- Desktop (>1024px): larger content area, optional sidebar timeline
- Touch targets minimum 44px
- Smooth transitions between steps
- Reduced motion support

---

## Implementation Log

### Exploration (Complete)

**Existing Components:**
1. `JourneyContainer.tsx` - Main container, basic responsive with mobile-first
   - Has sticky header with progress
   - Has sticky bottom navigation footer
   - Uses `safe-area-inset-bottom` for mobile
   - Has `animate-fade-in` for transitions

2. `StepNavigation.tsx` - Navigation buttons
   - Already has 44px min touch targets
   - Handles keyboard navigation

3. `Timeline.tsx` - Step timeline sidebar
   - Has 44px touch targets
   - Interactive step navigation

4. `ProgressBar.tsx` - Progress indicator
   - Shows completion percentage

**Current Status:**
- Mobile-first layout exists but needs enhancement
- No sidebar timeline integration for desktop
- No reduced motion support
- Need to add tablet breakpoint behavior
- Need to enhance transitions

### Implementation Plan

1. Enhance `JourneyContainer` with:
   - Desktop sidebar layout with Timeline
   - Proper responsive breakpoints
   - Reduced motion media query support
   - Enhanced transitions

2. Add responsive CSS utilities to Tailwind config

3. Write tests for responsive behavior

### Implementing...

**Changes made:**

1. **Tailwind config** (`tailwind.config.ts`):
   - Added `slideInRight` and `slideInLeft` animations
   - Added explicit screen breakpoints

2. **Global CSS** (`globals.css`):
   - Added `prefers-reduced-motion` media query
   - Added `safe-area-inset-bottom` support

3. **JourneyContainer** (`JourneyContainer.tsx`):
   - Added desktop sidebar with Timeline component
   - Added `showSidebar` prop (default: true)
   - Mobile: full-screen steps, bottom navigation
   - Tablet (sm/md): similar to mobile
   - Desktop (lg+): sidebar with timeline on left
   - Added directional slide animations
   - Uses `motion-safe:` prefix for animations (respects reduced motion)

Running type-check and lint... **passed** ✓

Writing tests for responsive layout...

Created `JourneyContainer.test.tsx` with 22 tests covering:
- Rendering basics (header, progress bar, navigation)
- Sidebar behavior (show/hide, timeline in sidebar)
- Accessibility (aria-labels, roles)
- Touch targets (44px minimum)
- Responsive classes (flex direction, padding, hidden on mobile)
- Animations (motion-safe classes)
- onComplete callback

**All tests passing: 251 tests (249 passed, 2 todo)** ✓

Running final verification...

**Verification Results:**
- `npm run lint` - ✓ passed
- `npm run type-check` - ✓ passed
- `npm run build` - ✓ successful
- `npm test` - ✓ 251 tests (249 passed, 2 todo)

### Screenshots Captured

1. **Desktop (1440x900):** `screenshots/48-responsive-desktop.png`
   - Sidebar with timeline visible
   - Progress bar in sidebar
   - Large content area
   - Bottom navigation

2. **Tablet (768x1024):** `screenshots/48-responsive-tablet.png`
   - No sidebar (similar to mobile)
   - Header with progress bar
   - Full-screen content
   - Bottom navigation with Back/Continue

3. **Mobile (375x667):** `screenshots/48-responsive-mobile.png`
   - Full-screen steps
   - Header with progress bar
   - Bottom navigation
   - Safe area support

### Acceptance Criteria Verification

- ✅ Mobile (<640px): full-screen steps, bottom navigation
- ✅ Tablet (640-1024px): similar to mobile layout
- ✅ Desktop (>1024px): larger content area, sidebar timeline
- ✅ Touch targets minimum 44px (verified in tests)
- ✅ Smooth transitions between steps (motion-safe animations)
- ✅ Reduced motion support (CSS media query + motion-safe prefix)

### Summary

Issue #48 complete. All acceptance criteria met.
