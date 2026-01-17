# Issue #3: Set up repo, CI/CD, hosting

## Acceptance Criteria

### 1. Project Structure
- [ ] Next.js 14+ with App Router
- [ ] TypeScript with strict mode enabled
- [ ] Tailwind CSS configured
- [ ] ESLint configured
- [ ] Source files in `src/` directory

### 2. Required Files Exist
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── [company]/
│   │   └── page.tsx          # Stub: renders company slug
│   ├── [company]/[role]/
│   │   └── page.tsx          # Stub: renders company + role slugs
│   └── api/health/
│       └── route.ts
├── components/ui/
├── lib/
│   ├── supabase/client.ts    # Stub only - implemented in #55
│   ├── supabase/server.ts    # Stub only - implemented in #55
│   └── utils.ts
└── types/
    └── index.ts
.eslintrc.json
```

**Note:** Supabase client files are stubs exporting placeholder functions. Actual implementation happens in #55.

### 3. TypeScript Config
- [ ] `strict: true` in tsconfig.json
- [ ] `noUncheckedIndexedAccess: true` in tsconfig.json
- [ ] Path alias `@/*` configured for `src/*`

### 4. CI/CD
- [ ] `.github/workflows/ci.yml` exists
- [ ] CI triggers on push to main
- [ ] CI triggers on PRs to main
- [ ] CI runs: lint, type-check, build

### 5. Deployment
- [ ] Vercel project connected
- [ ] Auto-deploy on push to main
- [ ] Environment variables configured (placeholders OK until #55)

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

# Format check (optional - skip if Prettier not configured)
npm run format:check 2>/dev/null || echo "Format check not configured"
```

### Endpoint Tests

```bash
# Start dev server first: npm run dev
# Wait for "Ready" message before running tests

# Health check
curl -s http://localhost:3000/api/health | jq .
# Expected: {"status":"ok","timestamp":"<ISO timestamp>"}

# Home page
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# Expected: 200

# Dynamic company route (stub page)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/google
# Expected: 200
# Page should display "google" slug somewhere

# Dynamic company/role route (stub page)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/google/software-engineer
# Expected: 200
# Page should display both "google" and "software-engineer" slugs
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
