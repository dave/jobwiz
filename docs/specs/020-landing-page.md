# Issue #20: Build dynamic landing page template

## Acceptance Criteria

### Dynamic Routing
- [ ] `/[company]/[role]` renders landing page
- [ ] `/[company]` lists available roles
- [ ] 404 for invalid company/role combinations
- [ ] Case-insensitive URL handling

### Content Display
- [ ] Company logo displayed
- [ ] Role-specific headline
- [ ] Generated marketing copy (from #12)
- [ ] Journey preview/teaser content
- [ ] Clear CTA above fold

### Performance
- [ ] SSG for top 100 company/role combos
- [ ] ISR for long-tail pages
- [ ] Lighthouse score > 90

### SEO
- [ ] Dynamic title: "{Company} {Role} Interview Prep | JobWiz"
- [ ] Dynamic meta description
- [ ] Open Graph tags
- [ ] JSON-LD structured data
- [ ] Auto-generated sitemap.xml

### Mobile
- [ ] Responsive design
- [ ] Touch-friendly CTA buttons (44px min)

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
