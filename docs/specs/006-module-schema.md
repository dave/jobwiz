# Issue #6: Module schema + position matrix

## Acceptance Criteria

### 1. Type Definitions
- [ ] `ModuleType` enum: `universal`, `industry`, `role`, `company`, `company-role`
- [ ] `ContentBlockType` enum: `text`, `header`, `quote`, `tip`, `warning`, `video`, `audio`, `image`, `quiz`, `checklist`, `infographic`, `animation`
  - Note: `quiz` is the schema name for multiple-choice components (see #8)
  - Note: `animation` covers Lottie animations (see #8)
- [ ] `Module` interface with: id, slug, type, title, description, sections, isPremium, order
- [ ] `ContentBlock` interface with type-specific content (discriminated union by `type` field)
- [ ] `Company` interface with: id, slug, name, industry
- [ ] `Role` interface with: id, slug, name, category
- [ ] `Industry` enum: `tech`, `finance`, `consulting`, `healthcare`, `retail`, `other`
- [ ] `RoleCategory` enum: `engineering`, `product`, `design`, `marketing`, `sales`, `operations`, `other`

### 2. Matrix Function
- [ ] `getModulesForPosition(company, role, registry)` function exists
- [ ] Returns modules in strict order (general → specific):
  1. `universal` - applies to all interviews
  2. `industry` - applies to all companies in that industry
  3. `role` - applies to all positions of that role type
  4. `company` - applies to all roles at that company
  5. `company-role` - specific to this exact company+role combo
- [ ] Within each type, modules are sorted by `order` field
- [ ] Handles missing modules gracefully (returns partial list, skips missing types)
- [ ] `splitByAccess(modules)` separates free/premium

### 3. Sample Data
- [ ] 1 universal module JSON sample
- [ ] 1 industry module JSON sample (e.g., Tech)
- [ ] 1 role module JSON sample (e.g., Software Engineer)
- [ ] 1 company module JSON sample (e.g., Google)
- [ ] All samples conform to TypeScript types

### 4. File Structure
```
src/
├── types/
│   ├── module.ts        # Module, ContentBlock, ModuleType, ContentBlockType
│   ├── position.ts      # Company, Role, Industry, RoleCategory
│   └── index.ts         # Re-exports all types
└── lib/
    └── modules/
        ├── matrix.ts    # getModulesForPosition, splitByAccess
        └── samples/
            ├── universal-interview-basics.json
            ├── industry-tech.json
            ├── role-software-engineer.json
            └── company-google.json
```

---

## Testing Criteria

### Type Check
```bash
npm run type-check
# Exit code: 0
# No type errors in module.ts, position.ts, or matrix.ts
```

### Unit Tests for Matrix Function

```typescript
// src/lib/modules/matrix.test.ts

describe('getModulesForPosition', () => {
  test('returns universal modules for any position', () => {
    const modules = getModulesForPosition(anyCompany, anyRole, registry)
    expect(modules.some(m => m.type === 'universal')).toBe(true)
  })

  test('returns modules in correct order (universal → industry → role → company → company-role)', () => {
    const modules = getModulesForPosition(techCompany, sweRole, fullRegistry)
    const types = modules.map(m => m.type)

    // Find first index of each type (if present)
    const typeOrder = ['universal', 'industry', 'role', 'company', 'company-role']
    const indices = typeOrder.map(t => types.indexOf(t)).filter(i => i !== -1)

    // Indices should be in ascending order
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1])
    }
  })

  test('handles empty registry gracefully', () => {
    const modules = getModulesForPosition(company, role, emptyRegistry)
    expect(modules).toEqual([])
  })

  test('handles missing module types gracefully', () => {
    // Registry with only universal modules
    const modules = getModulesForPosition(unknownCompany, role, universalOnlyRegistry)
    expect(modules.length).toBeGreaterThan(0)
    expect(modules.every(m => m.type === 'universal')).toBe(true)
  })

  test('sorts modules within same type by order field', () => {
    const modules = getModulesForPosition(company, role, registryWithMultipleUniversal)
    const universalModules = modules.filter(m => m.type === 'universal')
    const orders = universalModules.map(m => m.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})

describe('splitByAccess', () => {
  test('separates free and premium modules', () => {
    const modules = [
      { isPremium: false },
      { isPremium: true },
      { isPremium: false },
    ] as Module[]
    const { free, premium } = splitByAccess(modules)
    expect(free.length).toBe(2)
    expect(premium.length).toBe(1)
  })

  test('handles all-free modules', () => {
    const modules = [{ isPremium: false }, { isPremium: false }] as Module[]
    const { free, premium } = splitByAccess(modules)
    expect(free.length).toBe(2)
    expect(premium.length).toBe(0)
  })
})
```

### Run Tests
```bash
npm test -- --testPathPattern=matrix
# Exit code: 0
# All tests pass
```

### Sample Data Validation
```bash
# Verify all sample JSON files are valid
for f in src/lib/modules/samples/*.json; do
  echo "Validating $f..."
  node -e "require('$f')" && echo "  ✓ Valid JSON"
done

# Verify samples have required fields
node -e "
const fs = require('fs')
const path = require('path')
const samplesDir = './src/lib/modules/samples'

const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.json'))
for (const file of files) {
  const data = require(path.join(process.cwd(), samplesDir, file))
  const required = ['id', 'slug', 'type', 'title', 'sections', 'isPremium', 'order']
  const missing = required.filter(k => !(k in data))
  if (missing.length) {
    console.error(file + ': Missing fields:', missing.join(', '))
    process.exit(1)
  }
  console.log(file + ': ✓ All required fields present')
}
"
```

### Type Conformance Check
```typescript
// src/lib/modules/samples/index.test.ts
// This test file verifies samples conform to types at compile time

import type { Module, ContentBlockType } from '@/types'
import universal from './universal-interview-basics.json'
import industry from './industry-tech.json'
import role from './role-software-engineer.json'
import company from './company-google.json'

// These assertions verify the JSON matches the Module type
// If the JSON doesn't match, TypeScript will error at compile time
const _universal: Module = universal as Module
const _industry: Module = industry as Module
const _role: Module = role as Module
const _company: Module = company as Module

const validBlockTypes: ContentBlockType[] = [
  'text', 'header', 'quote', 'tip', 'warning',
  'video', 'audio', 'image', 'quiz', 'checklist',
  'infographic', 'animation'
]

describe('Sample modules', () => {
  test('all samples have valid type field', () => {
    expect(['universal', 'industry', 'role', 'company', 'company-role']).toContain(universal.type)
    expect(['universal', 'industry', 'role', 'company', 'company-role']).toContain(industry.type)
    expect(['universal', 'industry', 'role', 'company', 'company-role']).toContain(role.type)
    expect(['universal', 'industry', 'role', 'company', 'company-role']).toContain(company.type)
  })

  test('all content blocks use valid ContentBlockType', () => {
    const allModules = [universal, industry, role, company]
    allModules.forEach(mod => {
      mod.sections.forEach(section => {
        section.blocks.forEach(block => {
          expect(validBlockTypes).toContain(block.type)
        })
      })
    })
  })
})
```

---

## Definition of Done

1. All type definitions compile without errors
2. Matrix function has unit tests
3. All unit tests pass
4. 4 sample JSON files created (universal, industry, role, company)
5. Samples conform to TypeScript types (verified by type tests)
