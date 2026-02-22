# Phase 50: Enable Email/Password Auth - Research Context

## Current Auth Setup

- **Method:** Email OTP (magic link) only
- **SDK:** `@neondatabase/auth@0.1.0-beta.21`
- **Provider config:** `NeonAuthUIProvider` with `emailOTP` prop in `src/app/layout.tsx`
- **UI:** `AuthView` component in `src/app/auth/[path]/page.tsx` handles all flows automatically

## What Needs to Change

### 1. Neon Console Configuration (BLOCKING)

Must enable "Email/Password" in Neon Console:
- `Neon Console → Project → Auth → Configuration → Enable Email/Password`
- Without this, SDK methods for password auth will be rejected by the API

### 2. Layout Provider Change (1 line)

**Current** (`src/app/layout.tsx`):
```tsx
<NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailOTP>
```

**New:**
```tsx
<NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailAndPassword>
```

Or keep both:
```tsx
<NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailOTP emailAndPassword>
```

### 3. No Other Code Changes Required

The `AuthView` component automatically renders the right forms based on enabled methods:
- With `emailAndPassword`: Shows email + password sign-in/sign-up forms
- Automatically adds `/auth/forgot-password` and `/auth/reset-password` routes
- All handled by `@neondatabase/auth/react/ui` components

## SDK Methods Available (Already in Package)

```typescript
// Sign up
await authClient.signUp.email({ email, password, name })

// Sign in
await authClient.signIn.email({ email, password })

// Request password reset
await authClient.requestPasswordReset({ email, redirectURL })

// Complete reset
await authClient.resetPassword({ token, password })

// Change password (authenticated)
await authClient.changePassword({ currentPassword, newPassword })
```

## Password Reset Flow

1. User clicks "Forgot Password"
2. `authClient.requestPasswordReset({ email, redirectURL })` sends email
3. Email contains link with token → `/auth/reset-password?token=xyz`
4. `ResetPasswordForm` rendered by `AuthView`
5. User enters new password → `authClient.resetPassword({ token, password })`
6. 15-minute token expiry (default)

## Email Provider

- Neon Auth has its own shared email service (sends from `noreply@stackframe.co`)
- For production: configure custom SMTP in Neon Console with Resend credentials
- `RESEND_API_KEY` already in `.env` — can be used for custom SMTP config

## Files That DON'T Need Changes

- `src/lib/auth/client.ts` — SDK already supports all methods
- `src/lib/auth/server.ts` — Server init unchanged
- `src/app/api/auth/[...path]/route.ts` — Proxies all requests automatically
- `src/lib/auth-events.ts` — Audit logging works same for password auth
- Database schema — Neon Auth manages `neon_auth.user` and `neon_auth.account`

## Risks

- **Console config is blocking** — SDK won't work without it
- **No breaking changes** — magic link continues working if both enabled
- **Existing sessions unaffected** — users stay logged in
