# Phase 32: sidebar-nav-alphabetization — Context

**Gathered:** 2026-05-22
**Status:** Ready for planning
**Source:** Discuss-phase (zero gray areas — every decision pre-locked by ROADMAP + PROJECT.md target features + codebase scan)

<domain>
## Phase Boundary

Single-file edit to `src/components/app-sidebar.tsx`. Two surgical changes:

1. Add a `firearms` prefetch handler to the existing `prefetch` object (alphabetically between `artwork` and `insurance`).
2. Reorder the 6 existing Assets `SidebarMenuSubItem` entries into alphabetical order AND insert a new "Firearms" entry between Artwork and Insurance.

Covers REQ-IDs **ASSET-03** (Firearms reachable from Assets navigation group) and **ASSET-04** (Assets sub-items alphabetically ordered). Final UX gap closed — after this phase, /firearms is reachable from the sidebar instead of only by typing the URL or clicking a row in /assets.
</domain>

<decisions>
## Implementation Decisions

### File-level — one file, two edits

- **D-01** [LOCKED]: `src/components/app-sidebar.tsx` is the ONLY file modified. No new files, no lib changes, no schema changes, no test additions.

- **D-02** [LOCKED]: Add `firearms` prefetch handler to the `prefetch` object (~line 104, between `artwork` and `insurance` alphabetically):

  ```typescript
  firearms: () => {
      utils.firearm.list.prefetch({ entityId })
      utils.entity.list.prefetch()
  },
  ```

  Mirrors the `vehicles` prefetch pattern exactly (single-table prefetch + `entity.list.prefetch()`). No special-case prefetch — firearm doesn't have personalProperty's category-split or properties' multi-table fan-out.

### Alphabetical order — fully specified

- **D-03** [LOCKED]: Final order of the Assets `SidebarMenuSub` block:
  1. **Accounts** (existing — `href="/accounts"`, `prefetch.accounts`)
  2. **Artwork** (existing — `href="/artwork"`, `prefetch.artwork`)
  3. **Firearms** (NEW — `href="/firearms"`, `prefetch.firearms`)
  4. **Insurance** (existing — `href="/insurance"`, `prefetch.insurance`)
  5. **Personal Property** (existing — `href="/personal-property"`, `prefetch.personalProperty`)
  6. **Properties** (existing — `href="/properties"`, `prefetch.properties`)
  7. **Vehicles** (existing — `href="/vehicles"`, `prefetch.vehicles`)

  Current order (from codebase scan): `Properties → Accounts → Vehicles → Personal Property → Artwork → Insurance`. The reorder touches ALL 6 existing items, not just one insertion.

### "Firearms" sub-item shape — verbatim vehicles template

- **D-04** [LOCKED]: The new `SidebarMenuSubItem` is a copy-and-modify of the existing `Vehicles` item. Same wrapper, same Link composition with `onMouseEnter={prefetch.firearms}`, same `<span>Firearms</span>` label position. The icon (if vehicles has one) gets swapped to a firearm-appropriate lucide icon — but the planner/executor will check the existing items' icon pattern first; **if NO icons are used on Assets sub-items, the firearms entry uses no icon either** (consistency with the established pattern wins over adding a Firearms-specific icon).

### Out of scope (deliberate)

- **D-05** [LOCKED]: No changes to the sidebar's top-level Assets group label, icon, or expansion state. The Firearms entry slots into the existing collapsible.

- **D-06** [LOCKED]: No automated tests. The sidebar is a pure UI composition; verification is admin-UAT (visual: sidebar shows the 7-item alphabetical order). Matches the project-wide pattern — sidebar changes in prior phases (Phase 19 artwork/personal-property/insurance additions) shipped without dedicated tests.

- **D-07** [LOCKED]: No changes to any other sidebar section (Administration, Financial, Distributions, Liabilities, Activity Log, Settings). Phase 32 is strictly the Assets sub-group.

- **D-08** [LOCKED]: No edits to PROJECT.md / ROADMAP.md beyond the standard phase-completion bookkeeping that `gsd-sdk query phase.complete` already handles.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase analogs (HIGHEST priority — direct templates)
- `src/components/app-sidebar.tsx` lines 83-114 — the existing `prefetch` object; the `vehicles` handler (line 93-96) is the exact template for the new `firearms` handler
- `src/components/app-sidebar.tsx` lines ~375-445 — the existing Assets `SidebarMenuSub` block with 6 items; the Vehicles `SidebarMenuSubItem` is the verbatim template for the new Firearms item

### Schema + types (consumed)
- `src/server/trpc/router.ts` — `firearm: firearmRouter` already registered (Phase 29)
- `utils.firearm.list` — already exists on the tRPC client (Phase 29 exposed the procedure end-to-end-typed)

### Phase artifacts
- `.planning/phases/30-firearms-admin-page/30-01-SUMMARY.md` — confirms `/firearms` is the link target
- `.planning/REQUIREMENTS.md` — ASSET-03, ASSET-04
- `.planning/ROADMAP.md` — Phase 32 + 3 success criteria
- `.planning/PROJECT.md` — Target features list explicitly names the final 7-item order

### Documentation
- `CLAUDE.md` — Next.js 16 App Router conventions; `Link` prefetch behavior
</canonical_refs>

<specifics>
## Specific Ideas

### Exact shape of the new `firearms` prefetch handler

Insert at line ~104 between `artwork` and `insurance` (alphabetical insertion position):

```typescript
firearms: () => {
    utils.firearm.list.prefetch({ entityId })
    utils.entity.list.prefetch()
},
```

### Exact shape of the new `Firearms` SidebarMenuSubItem

Insert between Artwork and Insurance items in the Assets `SidebarMenuSub` block. Match the Vehicles item structure verbatim:

```jsx
<SidebarMenuSubItem>
    <SidebarMenuSubButton
        asChild
        onMouseEnter={prefetch.firearms}
    >
        <Link href="/firearms" prefetch={false}>
            <span>Firearms</span>
        </Link>
    </SidebarMenuSubButton>
</SidebarMenuSubItem>
```

(Final wrapper props mirror whatever the existing 6 items use — the planner verifies the exact shape before writing.)

### Reorder operation

The planner/executor can either:
- **(a) Rewrite the entire SidebarMenuSub block** in one Edit with all 7 items in the final alphabetical order, OR
- **(b) Multiple targeted Edits** — extract each item, move it, insert Firearms at its alphabetical slot.

Recommended: **(a)** — single edit replacing the entire block. Smaller diff in spirit (one logical reorder), atomic in terms of intermediate states. The block is ~50-70 lines; rewriting once is cleaner than 5+ targeted move edits.

### Verification

The 3 ROADMAP success criteria are admin-UAT:
1. Sidebar Assets dropdown shows the 7 items in alphabetical order (Accounts, Artwork, Firearms, Insurance, Personal Property, Properties, Vehicles)
2. Clicking "Firearms" navigates to `/firearms`
3. Hovering "Firearms" prefetches `firearm.list` and `entity.list` (devtools Network tab shows the tRPC queries firing on hover)

All 3 are 1-minute visual checks on any rendered page.
</specifics>

<deferred>
## Deferred Ideas

- **Icon for the Firearms sub-item** — if the existing items have no icons, Firearms uses no icon (consistency); if they all have icons, Firearms gets a `Crosshair` or `Target` lucide icon. Decided at execution time based on the codebase scan, not pre-committed.
- **Top-level "Assets" group rename / icon change** — out of scope; the group label stays as-is.
- **Automated sidebar test** — sibling sidebar additions (Phase 19) shipped without tests. Add holistically if sidebar-rendering tests ever become a milestone goal.
- **Sidebar collapsed-state Firearms display** — the existing collapsed state behavior applies uniformly; no special handling needed.
</deferred>

---

*Phase: 32-sidebar-nav-alphabetization*
*Context gathered: 2026-05-22*
*Decisions: 8 locked, 4 deferred*
