# Issue #6: Module schema + position matrix

## Acceptance Criteria

### 1. Type Definitions
- [ ] `ModuleType` enum: universal, company, industry, role, company-role
- [ ] `ContentBlockType` enum: text, header, quote, tip, warning, video, audio, image, quiz, checklist
- [ ] `Module` interface with: id, slug, type, title, description, sections, isPremium, order
- [ ] `ContentBlock` interface with type-specific content
- [ ] `Company` interface with: id, slug, name, industry
- [ ] `Role` interface with: id, slug, name, category
- [ ] `Industry` and `RoleCategory` enums

### 2. Matrix Function
- [ ] `getModulesForPosition(company, role, registry)` function exists
- [ ] Returns modules in order: universal → industry → role → company → company-role
- [ ] Handles missing modules gracefully (returns partial list)
- [ ] `splitByAccess(modules)` separates free/premium

### 3. Sample Data
- [ ] 1 universal module JSON sample
- [ ] 1 company module JSON sample (e.g., Google)
- [ ] 1 role module JSON sample (e.g., Software Engineer)
- [ ] All samples conform to TypeScript types

### 4. File Structure
```
src/
├── types/
│   ├── module.ts
│   ├── position.ts
│   └── index.ts
└── lib/
    └── modules/
        ├── matrix.ts
        └── samples/
            ├── universal-interview-basics.json
            ├── company-google.json
            └── role-software-engineer.json
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
// Expected test cases (implement in matrix.test.ts)

describe('getModulesForPosition', () => {
  test('returns universal modules for any position', () => {
    const modules = getModulesForPosition(anyCompany, anyRole, registry)
    expect(modules.some(m => m.type === 'universal')).toBe(true)
  })

  test('returns modules in correct order', () => {
    const modules = getModulesForPosition(techCompany, sweRole, fullRegistry)
    const types = modules.map(m => m.type)
    // universal should come before company
    const universalIndex = types.indexOf('universal')
    const companyIndex = types.indexOf('company')
    expect(universalIndex).toBeLessThan(companyIndex)
  })

  test('handles empty registry gracefully', () => {
    const modules = getModulesForPosition(company, role, emptyRegistry)
    expect(modules).toEqual([])
  })

  test('handles missing category gracefully', () => {
    const modules = getModulesForPosition(unknownCompany, role, registry)
    // Should still return universal modules
    expect(modules.length).toBeGreaterThan(0)
  })
})

describe('splitByAccess', () => {
  test('separates free and premium modules', () => {
    const modules = [
      { isPremium: false },
      { isPremium: true },
      { isPremium: false },
    ]
    const { free, premium } = splitByAccess(modules)
    expect(free.length).toBe(2)
    expect(premium.length).toBe(1)
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
# Verify samples load without error
npx ts-node -e "
import universal from './src/lib/modules/samples/universal-interview-basics.json'
import company from './src/lib/modules/samples/company-google.json'
import role from './src/lib/modules/samples/role-software-engineer.json'

console.log('Universal:', universal.type, universal.title)
console.log('Company:', company.type, company.targetCompany)
console.log('Role:', role.type, role.targetRole)
"
# Should print type and title/target for each sample
```

### Type Conformance Check
```typescript
// This should compile without errors
import type { Module } from '@/types'
import universal from './samples/universal-interview-basics.json'

const mod: Module = universal as Module
console.log(mod.id, mod.type)
```

---

## Definition of Done

1. All type definitions compile without errors
2. Matrix function has unit tests
3. All unit tests pass
4. 3 sample JSON files created and loadable
5. Samples conform to TypeScript types
