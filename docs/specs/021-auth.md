# Issue #21: Implement auth (Supabase Auth)

## Acceptance Criteria

### Auth Methods
- [ ] Email/password signup and login
- [ ] Google OAuth login
- [ ] Magic link (passwordless) option
- [ ] LinkedIn OAuth (if available)

### User Flow
- [ ] Signup creates account + profile
- [ ] Login redirects to previous page or dashboard
- [ ] Logout clears session
- [ ] Forgot password flow works

### Session Management
- [ ] Session persists across page refreshes
- [ ] Session expires appropriately
- [ ] Remember device option

### UI Components
- [ ] Login form with validation
- [ ] Signup form with validation
- [ ] Social login buttons
- [ ] Error messages displayed

### Security
- [ ] Row-level security enabled
- [ ] Users can only access own data
- [ ] Premium content gated by auth + purchase

---

## Testing Criteria

### Auth Flow Tests

```typescript
describe('Auth', () => {
  test('signup creates user and profile')
  test('login with valid credentials succeeds')
  test('login with invalid credentials shows error')
  test('logout clears session')
  test('forgot password sends email')
  test('Google OAuth redirects correctly')
})
```

### Session Tests

```typescript
describe('Session', () => {
  test('session persists on refresh')
  test('useAuth hook returns current user')
  test('protected route redirects when not logged in')
})
```

### RLS Tests

```typescript
describe('Row-level security', () => {
  test('user can read own profile')
  test('user cannot read other profiles')
  test('user can update own profile')
})
```

```bash
npm test -- --testPathPattern=auth
# All tests pass
```

---

## Sub-issues

- [ ] #55 - Supabase project setup
- [ ] #56 - Auth UI components
- [ ] #57 - Protected route middleware
- [ ] #58 - User profile table schema

---

## Definition of Done

1. Email and Google login work
2. Session management works
3. Protected routes redirect correctly
4. RLS policies in place
5. All sub-issues completed
