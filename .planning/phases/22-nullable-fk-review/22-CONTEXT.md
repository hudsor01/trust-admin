# Phase 22: Nullable FK Business Logic Review - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<vision>
## How This Should Work

Strict data integrity at the database level. If a relationship should exist, enforce it with NOT NULL constraints — no orphans, no missing links. The database should prevent incomplete records from being created in the first place.

For trust accounting, every income/expense entry must trace to a bank account. Money flows through accounts, so every transaction needs that connection. No abstract or floating entries.

</vision>

<essential>
## What Must Be Nailed

All three outcomes are equally important:

- **No orphaned records** — Distributions always have beneficiaries, accounting entries always have accounts
- **Clear audit trail** — Every record traces back to its parent entities for compliance/reporting
- **Prevent data entry errors** — Users can't accidentally create incomplete records; the database enforces completeness

</essential>

<boundaries>
## What's Out of Scope

Keep this phase narrowly scoped:

- **Breaking changes to PKs** — That's Phase 23 (TEXT to BIGINT migration). Keep FK structure as-is.
- **New FK relationships** — Only review EXISTING nullable FKs. Don't add new relationships.
- **UI validation changes** — Focus on database constraints. UI form validation is separate work.

</boundaries>

<specifics>
## Specific Ideas

- `trustAccounting.bankAccountId` should become NOT NULL — all entries need an account
- Secured debt FKs on `liability` (homesteadId, vehicleId, rentalPropertyId) should remain nullable — unsecured debt is valid
- Any data cleanup needed for existing null values should happen before constraint is applied

</specifics>

<notes>
## Additional Context

This is a trust administration application for the Hudson Living Trust. Data integrity is critical for:
- Legal compliance and fiduciary duty
- Clear audit trails for beneficiaries and regulators
- Preventing accounting errors that could affect distributions

The user is the trustee and wants the database to enforce business rules, not just document them.

</notes>

---

*Phase: 22-nullable-fk-review*
*Context gathered: 2026-01-18*
