# Issue #20: Build dynamic landing page template

**Dependencies:** #7 (Journey UI) for preview component, #12 (marketing copy)

## Acceptance Criteria

### Dynamic Routing (#33)
- [ ] `/[company]/[role]` renders landing page
- [ ] `/[company]` lists available roles for that company
- [ ] 404 for invalid company/role combinations
- [ ] Case-insensitive URL handling (Google = google = GOOGLE)

### Content Display (#34)
- [ ] Company logo displayed (or placeholder if missing)
- [ ] Role-specific headline
- [ ] Generated marketing copy (from #12)
- [ ] Journey preview: first 2-3 steps visible as teaser
- [ ] Clear CTA above fold: "Start Your Prep" or similar
- [ ] Trust signals area (placeholder for testimonial/stats)

### Company Theming (#36)
- [ ] Company brand color applied to accents/CTA
- [ ] Fallback theme for companies without custom colors
- [ ] Company logo displayed with proper sizing

### Performance
- [ ] SSG for companies in `companies` table (from #4 scraper)
- [ ] ISR with 24h revalidation for all pages
- [ ] Lighthouse score > 90 (Performance, Accessibility, SEO)

### SEO (#35)
- [ ] Dynamic title: "{Company} {Role} Interview Prep | JobWiz"
- [ ] Dynamic meta description referencing company/role
- [ ] Open Graph tags (title, description, image)
- [ ] JSON-LD structured data (Course schema)
- [ ] Auto-generated sitemap.xml from companies table

### Mobile
- [ ] Responsive design (mobile-first)
- [ ] Touch-friendly CTA buttons (44px min)
- [ ] Hero fits above fold on mobile

---

## Testing Criteria

### Route Tests

```typescript
describe('Landing page routing', () => {
  test('/google/swe renders Google SWE page')
  test('/google lists roles for Google')
  test('/invalid-company returns 404')
  test('/google/invalid-role returns 404')
  test('case insensitive: /Google/SWE works')
})
```

### Content Tests

```typescript
describe('Landing page content', () => {
  test('displays company logo')
  test('displays role in headline')
  test('displays marketing copy')
  test('CTA button visible above fold')
  test('displays journey preview (first 2-3 steps)')
})
```

### Theming Tests

```typescript
describe('Company theming', () => {
  test('applies company brand color to CTA')
  test('falls back to default theme when no company colors')
  test('company logo displays with proper aspect ratio')
})
```

### SEO Tests

```typescript
describe('Landing page SEO', () => {
  test('title includes company and role')
  test('meta description exists')
  test('OG tags present')
  test('JSON-LD schema present')
})
```

```bash
# Lighthouse audit
npx lighthouse http://localhost:3000/google/swe --output=json
# Performance score > 90
```

---

## Sub-issues

- [ ] #33 - Dynamic routing [company]/[role]
- [ ] #34 - Content fetching layer
- [ ] #35 - SEO/meta tag system
- [ ] #36 - Company theming system

---

## Definition of Done

1. Landing pages render for any valid company/role
2. SEO optimization complete
3. Lighthouse > 90
4. Mobile responsive
5. All sub-issues completed
