# Issue #3: Set up repo, CI/CD, hosting

## Acceptance Criteria

### 1. Project Structure
- [ ] Next.js 14+ with App Router
- [ ] TypeScript with strict mode enabled
- [ ] Tailwind CSS configured
- [ ] Source files in `src/` directory

### 2. Required Files Exist
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── [company]/
│   │   └── page.tsx
│   ├── [company]/[role]/
│   │   └── page.tsx
│   └── api/health/
│       └── route.ts
├── components/ui/
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   └── utils.ts
└── types/
    └── index.ts
```

### 3. TypeScript Config
- [ ] `strict: true` in tsconfig.json
- [ ] `noUncheckedIndexedAccess: true` in tsconfig.json

### 4. CI/CD
- [ ] `.github/workflows/ci.yml` exists
- [ ] CI triggers on push to main
- [ ] CI triggers on PRs to main
- [ ] CI runs: lint, type-check, build

### 5. Deployment
- [ ] Vercel project connected
- [ ] Auto-deploy on push to main
- [ ] Environment variables configured

---

## Testing Criteria

### Local Tests (all must pass)

```bash
# Install and build
npm ci
npm run build
# Exit code: 0

# Lint
npm run lint
# Exit code: 0, no errors

# Type check
npm run type-check
# Exit code: 0, no errors

# Format check (if configured)
npm run format:check
# Exit code: 0
```

### Endpoint Tests

```bash
# Start dev server, then:

# Health check
curl -s http://localhost:3000/api/health | jq .
# Expected: {"status":"ok","timestamp":"<ISO timestamp>"}

# Home page
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# Expected: 200

# Dynamic company route
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/google
# Expected: 200

# Dynamic company/role route
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/google/software-engineer
# Expected: 200
```

### CI Verification
1. Push commit to main or create PR
2. GitHub Actions workflow runs automatically
3. All jobs pass (lint, type-check, build)

### Production Verification
```bash
# Replace with actual Vercel URL
PROD_URL="https://jobwiz.vercel.app"

curl -s "$PROD_URL/api/health" | jq -e '.status == "ok"'
# Exit code: 0

curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/"
# Expected: 200
```

---

## Definition of Done

1. All local tests pass
2. All endpoint tests return expected results
3. CI workflow passes on main branch
4. Production deployment accessible
5. Health endpoint returns 200 on production
