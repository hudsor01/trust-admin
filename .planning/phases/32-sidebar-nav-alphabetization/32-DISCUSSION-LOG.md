# Phase 32 — Discussion Log

**Conducted:** 2026-05-22
**Mode:** discuss (zero gray areas; CONTEXT.md written directly from ROADMAP + codebase scan)
**Areas presented:** 0 (no gray areas to surface — see below)
**Decisions produced:** 8 LOCKED + 4 DEFERRED

---

## Why no discussion

Phase 32 is the smallest phase of the v5.0 milestone. Every implementation choice is pre-locked:

1. **Final alphabetical order** — ROADMAP success criterion #1 names the 7 items in exact order (Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles). Also locked in PROJECT.md Target features.
2. **Touch points** — codebase scan confirms: `src/components/app-sidebar.tsx`, two locations (prefetch object line ~83-114, Assets SidebarMenuSub block line ~375-445). No other files in scope.
3. **Prefetch handler shape** — mirrors the existing `vehicles` handler exactly (`utils.firearm.list.prefetch({ entityId })` + `utils.entity.list.prefetch()`).
4. **SidebarMenuSubItem shape** — verbatim copy-and-modify from the existing Vehicles item.
5. **No automated tests** — sibling sidebar additions (Phase 19) shipped without tests; matches project-wide pattern.

The only execution-time judgment call is the icon (does Firearms get one?). That's a "match what the other 6 items do" decision — execution-time codebase scan, not a planning gate.

---

## Decisions captured (LOCKED — see CONTEXT.md)

| ID | Decision |
|---|---|
| D-01 | Single file: `src/components/app-sidebar.tsx`. No new files, no lib changes, no tests. |
| D-02 | Add `firearms` prefetch handler between `artwork` and `insurance` (alphabetical). |
| D-03 | Final order: Accounts → Artwork → Firearms → Insurance → Personal Property → Properties → Vehicles. |
| D-04 | New Firearms SidebarMenuSubItem is a copy-and-modify from Vehicles. Icon decision deferred to execution-time scan. |
| D-05 | No changes to top-level Assets group label/icon/expansion. |
| D-06 | No automated tests (Phase 19 precedent). |
| D-07 | No changes to any other sidebar section. |
| D-08 | No PROJECT.md / ROADMAP.md edits beyond `gsd-sdk query phase.complete` bookkeeping. |

---

## Deferred Ideas

- Icon for the new sub-item (decided at execution based on the existing 6 items' icon pattern)
- Top-level Assets group rename/icon (out of scope)
- Sidebar-rendering automated tests (holistic — Phase 19 precedent applies)
- Collapsed-state special handling (none needed; existing behavior applies uniformly)

---

## Scope Creep — Redirected

None — there was no discussion to redirect anything from.
