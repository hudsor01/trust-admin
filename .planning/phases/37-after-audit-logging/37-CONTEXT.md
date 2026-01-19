# Phase 37: after() for Audit Logging - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<vision>
## How This Should Work

Audit logging should happen in the background after the response is sent back to the user. Currently, every tRPC mutation writes to the activityLog table synchronously, blocking the response until the write completes.

With after(), the mutation completes, response goes back to the client immediately, and then the audit log write happens in the background. Fire-and-forget approach - no need for guaranteed delivery or retry mechanisms.

The user should never notice the audit logging happening. It's infrastructure-level work that shouldn't impact UX.

</vision>

<essential>
## What Must Be Nailed

- **Non-blocking responses** - Mutations return faster because they don't wait for audit log writes
- **Clean architecture** - Separation between the business operation (mutation) and the observability concern (audit logging)
- **Same audit data** - The after() calls still capture everything we currently log (user, action, entity, timestamp)

</essential>

<boundaries>
## What's Out of Scope

- No explicit scope restrictions mentioned
- Open to whatever approach makes sense for this codebase
- Error handling for failed audit writes not a priority (fire-and-forget is acceptable)

</boundaries>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches using React 19's after() API.

</specifics>

<notes>
## Additional Context

This follows Phase 36's useOptimistic work - part of the v6.0 milestone focused on React 19.2 platform optimizations. The goal is modernizing the codebase to take advantage of new React/Next.js APIs.

The activity log is used for trust administration audit trails, but the logging itself doesn't need to be synchronous - what matters is that it eventually gets recorded.

</notes>

---

*Phase: 37-after-audit-logging*
*Context gathered: 2026-01-18*
