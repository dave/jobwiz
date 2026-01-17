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
// scripts/validate-template.ts
import { z } from 'zod'
import { ContentBlockType } from '@/types'

const SectionSchema = z.object({
  title: z.string(),
  blockTypes: z.array(z.enum(ContentBlockType)),
  required: z.boolean(),
  estimatedWordCount: z.number().optional(),
  exampleContent: z.string().optional(),
})

const TemplateSchema = z.object({
  name: z.string(),
  moduleType: z.enum(['universal', 'company', 'role', 'combined']),
  sections: z.array(SectionSchema),
})

// Run via: npx ts-node scripts/validate-template.ts templates/company-module.md
```

```typescript
describe('Module templates', () => {
  const templates = ['universal', 'company', 'role', 'combined']

  templates.forEach(template => {
    describe(`${template}-module template`, () => {
      test('parses without errors')
      test('all sections have valid ContentBlockTypes')
      test('has at least one required section')
      test('word count estimates are reasonable (100-2000)')
      test('example content is provided for each section')
    })
  })
})
```

### Template Validation Script

```bash
# Add to package.json scripts:
# "validate-template": "ts-node scripts/validate-template.ts"

npm run validate-template -- templates/universal-module.md
npm run validate-template -- templates/company-module.md
npm run validate-template -- templates/role-module.md
npm run validate-template -- templates/combined-module.md
# All exit code: 0
```

### Cross-template Consistency

```typescript
describe('Template consistency', () => {
  test('all templates use same markdown structure')
  test('section headings follow consistent naming')
  test('all templates reference valid block types from #6')
})
```

---

## Dependencies

- #6 (Module Schema) must be complete for ContentBlockType enum

---

## Definition of Done

1. 4 template structure documents created in `templates/` directory
2. Templates match schema types from #6
3. `validate-template` script created and added to package.json
4. All templates pass validation
5. Example content snippets included in each template
6. Templates reviewed and approved for batch generation use
