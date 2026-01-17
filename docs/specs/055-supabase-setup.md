# Issue #55: Supabase project setup

**Stage 1: Foundation** - Required before other stages can begin.

## Acceptance Criteria

### Supabase Projects
- [ ] Development project created in Supabase dashboard
- [ ] Production project created (separate from dev)
- [ ] Project URLs and keys documented in team docs

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured (server-side only)
- [ ] `.env.local` for local development
- [ ] Vercel env vars for production

### Supabase Client Setup
- [ ] `lib/supabase/client.ts` - browser client (uses anon key)
- [ ] `lib/supabase/server.ts` - server client (uses service role)
- [ ] TypeScript types generated from database schema

### Auth Providers Enabled
- [ ] Email/password enabled in Supabase dashboard
- [ ] Google OAuth configured with credentials
- [ ] Magic link (passwordless) enabled
- [ ] LinkedIn OAuth (if available in Supabase)

### Initial Database Setup
- [ ] Database accessible
- [ ] Basic RLS enabled (default deny)

---

## Testing Criteria

### Connection Test

```typescript
describe('Supabase setup', () => {
  test('browser client connects successfully')
  test('server client connects successfully')
  test('can query public table')
})
```

### Auth Provider Test

```typescript
describe('Auth providers', () => {
  test('auth.signUp with email/password works')
  test('auth.signInWithOAuth redirects to Google')
  test('magic link sends email')
})
```

### CLI Verification

```bash
# Verify connection
npm run test:supabase-connection
# Output: Connected to Supabase successfully

# Verify env vars
npm run check-env
# Output: All required Supabase env vars present
```

---

## Definition of Done

1. Dev and prod Supabase projects created
2. Environment variables configured in all environments
3. Supabase clients work (browser + server)
4. Auth providers enabled and tested
5. Team has access to both projects
