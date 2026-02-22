# Phase 51: Admin User Provisioning - Research Context

## Current User → Beneficiary Linking

```
neon_auth.user (id='abc123', role='user')
         ↓ FK: userId
   user_profile (userId='abc123', beneficiaryId=42, role='beneficiary')
         ↓ FK: beneficiaryId
   beneficiary (id=42, email='alice@example.com', firstName='Alice', ...)
```

### Tables

- **`neon_auth.user`** — Managed by Neon Auth. Fields: id, name, email, role, emailVerified, etc.
- **`user_profile`** — App-managed bridge. Fields: userId (PK, FK to neon_auth.user), role (enum), beneficiaryId (FK), createdAt, updatedAt
- **`beneficiary`** — Business entity. ~20 beneficiaries in seed data. Has email field (contact email, may differ from auth email)

### Current Scripts

- `scripts/setup-admin.ts` — Creates/updates `userProfile` with `role: 'admin'` for a user
- **No script exists** for creating beneficiary user accounts

## Neon Auth Admin Plugin — Available Methods

| Method | Purpose | Server-side |
|--------|---------|-------------|
| `authServer.admin.createUser({ email, password, name, role })` | Create user with credentials | Yes |
| `authServer.admin.setRole({ userId, role })` | Change user role | Yes |
| `authServer.admin.setUserPassword({ userId, password })` | Force-set password | Yes |
| `authServer.admin.updateUser({ userId, name, email, image })` | Update user fields | Yes |
| `authServer.admin.banUser({ userId })` / `unbanUser` | Restrict access | Yes |
| `authServer.admin.listUsers({ limit, offset, search })` | Query users | Yes |
| `authServer.admin.removeUser({ userId })` | Hard delete | Yes |
| `authServer.admin.impersonateUser({ userId })` | Debug as user | Yes |

**All admin methods require server-side context** (auth secret via NEON_AUTH_BASE_URL).

## Proposed Provisioning Flow

```
Admin Dashboard → "Create Portal Account" button on beneficiary detail
         ↓
Modal Form: email (pre-filled from beneficiary.email), temp password
         ↓
tRPC Mutation: userManagement.createBeneficiaryUser
  1. authServer.admin.createUser({ email, password, name, role: 'user' })
  2. db.insert(userProfile).values({ userId, beneficiaryId, role: 'beneficiary' })
  3. Set forcePasswordChange flag (Phase 52)
  4. Log to activityLog
         ↓
Success: Show confirmation with temp credentials (shown once)
```

## What Needs to Be Built

### Backend

1. **New tRPC router** `src/server/trpc/routers/userManagement.ts`:
   - `createBeneficiaryUser(beneficiaryId, email, tempPassword)` — adminProcedure
   - `listProvisionedUsers()` — adminProcedure
   - `resetUserPassword(userId)` — adminProcedure
   - `unlinkBeneficiary(userId)` — adminProcedure

2. **Validation schemas** in `db/validation.ts`:
   - `createBeneficiaryUserInput` — beneficiaryId, email, tempPassword

3. **Register router** in `src/server/trpc/router.ts`

### Frontend

4. **Admin UI** — either:
   - Button on beneficiary detail page → modal form, OR
   - New `/user-management` page with beneficiary list + provisioning

### Database

5. **user_profile** — already has the right columns, no migration needed
6. **Add `forcePasswordChange` column** (Phase 52 dependency, but schema change here)

## Limitations

- Neon Auth `createUser` sets role to `"user"` (not "beneficiary") — app role lives in `userProfile`
- Must call `createUser` server-side (admin methods require auth secret)
- No built-in "welcome email" from Neon Auth — must implement separately or rely on password reset flow
- One `userProfile` per Neon Auth user (PK on userId)

## Existing Patterns to Follow

- Use `adminProcedure` for all mutations
- Follow existing router pattern (see `src/server/trpc/routers/beneficiary.ts`)
- Log all provisioning actions to `activityLog`
- Use Sentry `traceBusinessOperation()` for tracing
