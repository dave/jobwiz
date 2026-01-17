# Issue #14: AI-assisted module structure design

## Acceptance Criteria

### Template Documents
- [ ] `templates/universal-module.md` structure document exists
- [ ] `templates/company-module.md` structure document exists
- [ ] `templates/role-module.md` structure document exists
- [ ] `templates/combined-module.md` structure document exists

### Each Template Defines
- [ ] Section headings and order
- [ ] Content block types per section (text, video, quiz, etc.)
- [ ] Required vs optional sections
- [ ] Estimated word count per section
- [ ] Example content snippets

### Consistency
- [ ] Templates align with Module schema from #6
- [ ] Templates align with ContentBlock types from #6
- [ ] Templates are repeatable for batch generation

---

## Testing Criteria

### Schema Conformance

```typescript
describe('Module templates', () => {
  test('universal template sections map to ContentBlockTypes')
  test('company template sections map to ContentBlockTypes')
  test('role template sections map to ContentBlockTypes')
  test('all required fields defined')
})
```

### Template Validation

```bash
# Validate template structure
npm run validate-template -- --template=company-module
# Exit code: 0
# All sections have valid block types
```

---

## Definition of Done

1. 4 template structure documents created
2. Templates match schema types from #6
3. Templates reviewed and approved for batch use
4. Example content snippets included in each template
