# Issue #21: Implement auth (Supabase Auth)

**Prerequisite:** #55 (Supabase project setup) - Stage 1

## Acceptance Criteria

### Auth Methods (#56)
- [ ] Email/password signup and login
- [ ] Google OAuth login
- [ ] Magic link (passwordless) option

> **Note:** LinkedIn OAuth deferred - limited Supabase support and lower priority

### User Flow
- [ ] Signup creates account + profile row
- [ ] Login redirects to previous page (journey step where they were)
- [ ] Logout clears session
- [ ] Forgot password flow works

### Auth Trigger Points
- [ ] Paywall CTA triggers auth modal (must log in to purchase)
- [ ] No forced login until paywall hit (anonymous journey allowed)
- [ ] After auth, proceed to Stripe checkout

### Session Management
- [ ] Session persists across page refreshes
- [ ] Session expires after 7 days of inactivity
- [ ] Auth state synced with journey progress (#7)

### UI Components (#56)
- [ ] Auth modal (not separate page) for seamless flow
- [ ] Login/signup tabs within modal
- [ ] Social login buttons (Google)
- [ ] Email/password form with validation
- [ ] Error messages displayed inline

### User Profile (#58)
- [ ] `user_profiles` table with: id, email, target_company, target_role
- [ ] Profile created on signup with company/role from URL
- [ ] Profile viewable (no edit UI needed for MVP)

### Security
- [ ] Row-level security enabled on all user tables
- [ ] Users can only access own data
- [ ] Premium content gated by auth + purchase (checked via `access_grants`)

---

## Testing Criteria

### Auth Flow Tests

```typescript
describe('Auth', () => {
  test('signup creates user and profile')
  test('signup captures company/role from URL into profile')
  test('login with valid credentials succeeds')
  test('login with invalid credentials shows error')
  test('logout clears session')
  test('forgot password sends email')
  test('Google OAuth redirects correctly')
})
```

### Auth Modal Tests

```typescript
describe('Auth modal', () => {
  test('modal opens when paywall CTA clicked')
  test('modal has login/signup tabs')
  test('successful auth closes modal')
  test('after auth, proceeds to checkout flow')
  test('modal can be dismissed without auth')
})
```

### Session Tests

```typescript
describe('Session', () => {
  test('session persists on refresh')
  test('useAuth hook returns current user')
  test('journey progress syncs after login')
  test('anonymous users can progress through free content')
})
```

### RLS Tests

```typescript
describe('Row-level security', () => {
  test('user can read own profile')
  test('user cannot read other profiles')
  test('user can read own access_grants')
  test('user cannot read other access_grants')
})
```

```bash
npm test -- --testPathPattern=auth
# All tests pass
```

---

## Sub-issues

- [ ] #56 - Auth UI components (modal with login/signup)
- [ ] #57 - Protected route middleware (redirect to auth when needed)
- [ ] #58 - User profile table schema (user_profiles + RLS)

---

## Definition of Done

1. Email and Google login work
2. Auth modal triggers from paywall
3. Session persists and syncs with journey progress
4. user_profiles table with RLS policies
5. Anonymous users can access free content
6. All sub-issues completed
