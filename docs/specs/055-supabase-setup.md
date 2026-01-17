# Issue #55: Supabase project setup

**Stage 1: Foundation** - Required before #4 (scraper) and Stage 2+ can begin.

**Prerequisite:** #3 (repo setup) must be complete - provides stub files this issue implements.

## Acceptance Criteria

### Supabase Projects
- [ ] Development project created in Supabase dashboard
- [ ] Production project created (separate from dev)
- [ ] Project URLs and keys documented in `.env.example`

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured (server-side only, never exposed to client)
- [ ] `.env.local` created from `.env.example` for local development
- [ ] Vercel env vars configured for production

### Supabase Client Setup
- [ ] `lib/supabase/client.ts` - browser client implementation (replaces #3 stub)
- [ ] `lib/supabase/server.ts` - server client implementation (replaces #3 stub)
- [ ] Clients export typed functions that work with our schema

**Note:** TypeScript types from database schema will be generated later when tables are created (#4, #21). For now, clients use `any` or minimal types.

### Auth Providers Enabled (Dashboard Only)
- [ ] Email/password enabled in Supabase dashboard
- [ ] Google OAuth configured with credentials (Google Cloud Console app required)
- [ ] Magic link (passwordless) enabled
- [ ] LinkedIn OAuth enabled (available in Supabase)

**Note:** Auth UI/flows are implemented in #21 (Stage 2). This issue only enables providers in the dashboard.

### Initial Database Setup
- [ ] Database accessible (can connect)
- [ ] Default RLS enabled (tables deny all by default until policies added)

---

## Testing Criteria

### Connection Test

```typescript
// src/lib/supabase/__tests__/connection.test.ts

describe('Supabase setup', () => {
  test('browser client initializes without error', () => {
    const client = createBrowserClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })

  test('server client initializes without error', () => {
    const client = createServerClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })

  test('can connect to database', async () => {
    const client = createServerClient()
    // Simple health check - this query works even with no tables
    const { error } = await client.from('_health_check_nonexistent').select().limit(0)
    // Error should be "relation does not exist", NOT a connection error
    expect(error?.message).toContain('does not exist')
  })
})
```

### Auth Provider Verification (Manual)

Since auth providers are dashboard-only at this stage, verify manually:

```bash
# 1. Check Supabase dashboard → Authentication → Providers
# Verify these are enabled:
# - Email (enabled)
# - Google (enabled, client ID configured)
# - LinkedIn (enabled, client ID configured)

# 2. Test email signup via Supabase dashboard
# Go to Authentication → Users → Invite user
# Send invite to test email, verify email arrives
```

### Environment Variables Check

```bash
# Verify all required env vars are set
node -e "
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]
const missing = required.filter(k => !process.env[k])
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '))
  process.exit(1)
}
console.log('✓ All required Supabase env vars present')

// Verify URL format
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!url.includes('supabase.co')) {
  console.error('Invalid Supabase URL format')
  process.exit(1)
}
console.log('✓ Supabase URL format valid')
"
```

### Integration Test

```bash
# Start dev server and verify Supabase client loads
npm run dev &
sleep 5

# Check that the app starts without Supabase errors
curl -s http://localhost:3000/ | grep -v "Supabase" && echo "✓ No Supabase errors on homepage"

# Kill dev server
kill %1
```

---

## Definition of Done

1. Dev and prod Supabase projects created
2. `.env.example` documents all required variables
3. `.env.local` configured for local development
4. Vercel env vars configured for production
5. Supabase clients initialize without errors
6. Auth providers enabled in dashboard (email, Google, LinkedIn)
7. Connection test passes
