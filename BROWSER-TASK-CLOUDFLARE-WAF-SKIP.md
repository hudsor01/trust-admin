# Browser Task — Cloudflare WAF Skip Rule for Forgejo Container Registry

You are a browser-driving agent. Your job is to add (or verify) a Cloudflare WAF Custom Rule that exempts the Forgejo OCI registry path from Cloudflare's security stack, so GitHub Actions runners (Azure egress IPs) can successfully `docker login` and `docker push`. Follow the steps in order.

## Context (read this first, do not act on it)

GitHub Actions runs `.github/workflows/build-image.yml` on every push to `main` for the `hudsor01/trust-admin` repo. The job dies at the Login step:

```
Error response from daemon: login attempt to https://git.thehudsonfam.com/v2/ failed with status: 403 Forbidden
```

Diagnostics ruled out the Forgejo side:
- The token (`github-actions-trust-admin`, owner `dev-server`) has `write:package` scope.
- The `dev-server` user can list its own packages namespace.
- Forgejo's token "Last used" timestamp shows **no recent activity** — the auth request is never reaching Forgejo.

External anonymous probes against `https://git.thehudsonfam.com/v2/` from non-Azure IPs return the expected `401 Bearer ...` challenge. Only requests from GitHub Actions runners get `403`. That points unambiguously to a Cloudflare WAF / Bot Fight Mode / Managed Rule blocking Azure egress IPs at the edge.

## Sign-in

1. Open `https://dash.cloudflare.com`. If a sign-in form appears, ask the user to sign in themselves — do not enter passwords on their behalf. Wait for the user to confirm.
2. After sign-in, you land on the Cloudflare account home (a list of zones / sites). Find and click into the zone that owns `git.thehudsonfam.com`. The display name will likely be `thehudsonfam.com` (a parent zone) or `git.thehudsonfam.com` (a dedicated zone).
3. If neither zone is obvious, ask the user which zone owns the `git.thehudsonfam.com` hostname.

## Step 1 — verify the symptom

4. Inside the zone, navigate to **Security → Events** (sometimes labelled **Security Events** or **Analytics & Logs**).
5. Set the time range filter to **Last 24 hours**.
6. Filter for **Action: Blocked** OR **Action: Managed Challenge**. Look for entries with:
   - Host: `git.thehudsonfam.com`
   - Path starting with `/v2/`
   - Source: an Azure / Microsoft IP range
7. Record what you see. If you find any matching blocked events, that confirms the WAF is the culprit. If you find NONE matching, stop and report: "No Cloudflare blocks observed for /v2/ in the last 24h — the 403 may be from a different middlebox; need to recheck assumptions."

## Step 2 — check for an existing skip rule

8. Navigate to **Security → WAF → Custom rules** (some accounts call this **Security → WAF → Rules**, in a tab labelled "Custom rules").
9. List every rule. For each, record:
   - **Name**
   - **Expression** (in the rule editor view)
   - **Action** (Block / Skip / Allow / Challenge / Log)
10. If you find an existing rule whose expression includes `git.thehudsonfam.com` AND `/v2/` AND whose action is `Skip`, the rule already exists — report: "Skip rule already present, no action needed. The 403 has another cause." Stop.

## Step 3 — create the skip rule

11. Click **Create rule**.
12. Fill in the form (use the **Edit expression** toggle to paste raw, not the visual builder — the visual builder mis-renders `starts_with`):
    - **Rule name**: `Allow GitHub Actions to Forgejo container registry`
    - **Expression**: `(http.host eq "git.thehudsonfam.com" and starts_with(http.request.uri.path, "/v2/"))`
    - **Action**: `Skip`
    - **WAF features to skip** (check ALL that the UI offers — there may be 4-6 checkboxes depending on plan tier):
      - `All remaining custom rules`
      - `Managed rules` (sometimes labelled `WAF Managed Rules`)
      - `Rate limiting rules`
      - `Super Bot Fight Mode` (Pro+ plans only — only visible if enabled)
      - `Bot Fight Mode` (Free plan equivalent — only visible if enabled)
      - `Zone Lockdown` (only visible if any lockdown rules exist)
13. Click **Deploy** (some plans show **Save** then **Deploy** as two steps).
14. Confirm the rule appears in the list with status **Enabled** / **Active**.

## Step 4 — re-run the failing GitHub Actions workflow

15. Open a new tab to `https://github.com/hudsor01/trust-admin/actions/workflows/build-image.yml`.
16. Click the most recent run (it will show as failed in red).
17. Top-right corner → **Re-run all jobs**.
18. Watch the Login step. If it now reads `Login Succeeded` and the workflow proceeds to **Build & push**, the fix worked. Wait for the whole workflow to finish (cold build is ~5-8 minutes; cached builds ~2 minutes).

## Reporting

Output a single summary block at the end:

```
Cloudflare zone: <zone name>
Blocked events observed (step 1): <count of /v2/ blocks from Azure IPs in last 24h>
Existing skip rule found: <yes/no>
New rule created: <yes/no — name + expression + features skipped>
Re-run result: <Login Succeeded / Login still 403 / workflow succeeded end-to-end / other>
Image pushed: <yes/no — if yes, paste the tag from the workflow's job summary>
```

## Out of scope

Do NOT:
- Enter the user's Cloudflare password yourself — always ask the user to sign in.
- Disable the Cloudflare proxy on `git.thehudsonfam.com` DNS (orange-cloud → grey-cloud). That's a heavier-handed alternative the user can do separately if WAF skip doesn't fix it.
- Touch any Cloudflare setting outside the WAF Custom Rules section (no DNS edits, no SSL/TLS, no Page Rules).
- Regenerate the Forgejo token — that has its own task and has already been verified correct.
