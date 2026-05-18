# Browser Task — Verify Forgejo Token for trust-admin Image Push

You are a browser-driving agent. Your job is to verify (and if necessary regenerate) the Forgejo Personal Access Token that GitHub Actions uses to push the trust-admin container image to `git.thehudsonfam.com/dev-server/trust-admin`. Follow the steps in order. Stop and ask the user only when explicitly told to.

## Context (read this first, do not act on it)

A GitHub Actions workflow (`.github/workflows/build-image.yml`) tries to `docker login` to `git.thehudsonfam.com` using two GitHub secrets:

- `FORGEJO_USERNAME` (expected value: `dev-server`)
- `FORGEJO_TOKEN` (Forgejo Personal Access Token)

Login currently fails with HTTP **403 Forbidden** at `https://git.thehudsonfam.com/v2/`. Possible causes, in order of likelihood:

1. The token was generated without the `write:package` scope (most common — Forgejo's UI defaults to NO scopes selected).
2. The Cloudflare WAF in front of `git.thehudsonfam.com` is blocking the GitHub Actions Azure egress IPs (returns 403). This is environmental, not a Forgejo issue, and is handled in a separate task — but we still want to confirm the token side is correct so we don't have two problems hiding each other.
3. The `dev-server` user lacks package permissions on its own namespace (unusual).

## Sign-in

1. Ask the user for the Forgejo URL (likely `https://git.thehudsonfam.com`).
2. Open it. If a sign-in form appears, ask the user to sign in themselves — do not enter passwords on their behalf. Once they confirm they are signed in, continue.
3. Confirm the signed-in user is `dev-server` by looking at the top-right avatar / username area. If it is NOT `dev-server`, stop and report: "Wrong user signed in — expected `dev-server`, saw `<actual>`."

## Step 1 — inspect existing tokens

4. Navigate to **Settings → Applications** (the URL is typically `/-/user/settings/applications` or `/user/settings/applications`).
5. Find the section labeled "Manage Access Tokens" (also sometimes "Personal Access Tokens").
6. List every existing token. For each, record:
   - **Name** (whatever the user called it, e.g. `github-actions-trust-admin`)
   - **Scopes** (exactly as displayed — Forgejo shows them as chips or a list, e.g. `read:package`, `write:package`)
   - **Last used** (if shown)
7. If you find a token whose name matches the GitHub Actions usage (e.g. anything mentioning github / actions / trust-admin / build) AND whose scopes include exactly `write:package` (or `package` with the `write` sub-permission), report: "Existing token has correct scope; the failure is not on the Forgejo side."
8. If you find such a token but its scopes do NOT include `write:package` (e.g. only `read:package`, or only `repository`, or empty), proceed to Step 2.

## Step 2 — regenerate the token with the correct scope

9. Delete the misconfigured token by clicking its delete / trash button. Confirm the deletion.
10. In the "Generate New Token" form:
    - **Token name**: `github-actions-trust-admin`
    - **Expiration**: ask the user for their preference (default: no expiration)
    - **Scopes**: find the `package` resource section. Tick BOTH `read` AND `write`. (In newer Forgejo, this may be displayed as a single `write:package` checkbox which implicitly includes read.) Do NOT tick any other scopes — `write:package` is enough for `docker push`.
11. Click **Generate Token**.
12. The new token is displayed ONCE on the next screen. Copy it to the clipboard.
13. Stop and tell the user: "New token generated and copied to clipboard. Paste it into the GitHub repo secret `FORGEJO_TOKEN` at https://github.com/hudsor01/trust-admin/settings/secrets/actions — overwrite the old value. Reply when done."

## Step 3 — verify package-namespace access

14. After the user confirms the secret has been updated, navigate to `https://git.thehudsonfam.com/dev-server/-/packages` (or wherever Forgejo lists packages for the `dev-server` user). The exact URL may vary; try the user profile page if `-/packages` doesn't work.
15. Confirm you can see at least one existing package (the existing `trust-admin` container image should be listed, with the tag the cluster is currently pulling — likely `20260517231856` or similar).
16. If the packages page exists but is empty, the user `dev-server` may not own any packages yet — that is acceptable for a first push, but record it.
17. If the packages page returns 404 or you get redirected to a sign-in page, the user does not have permission to list packages under `dev-server`. Stop and report: "User cannot access packages for `dev-server` namespace — token scope is correct but user lacks namespace membership."

## Reporting

Output a single summary block when done:

```
Signed-in user: <username>
Existing tokens found: <list with names + scopes>
Token used by GitHub Actions: <name | "regenerated as github-actions-trust-admin">
Scope verified: <yes/no — quote the exact scope strings shown>
New token written to GitHub secret: <yes/no — based on user's confirmation>
Packages page accessible: <yes/no — what was visible>
Recommended next step: <"re-run Build & Push Image workflow" | "investigate Cloudflare WAF (separate task)" | "investigate org membership">
```

## Out of scope

Do NOT:
- Enter the user's password yourself — always ask the user to sign in.
- Touch any other Forgejo settings (Webhooks, GPG keys, SSH keys, etc.).
- Modify any repository settings — this is purely about the access token.
- Try to fix Cloudflare WAF issues — that lives in a separate task that needs Cloudflare dashboard access, not Forgejo.
