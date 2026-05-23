# Phase 32: sidebar-nav-alphabetization — Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 1
**Analogs found:** 1 / 1 (file is its own analog — both edits copy from existing entries)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/components/app-sidebar.tsx` | component | request-response (prefetch on hover) | `src/components/app-sidebar.tsx` (self) | exact |

---

## Pattern Assignments

### `src/components/app-sidebar.tsx` — Edit 1: `prefetch` object insertion

**Analog:** `vehicles` handler, lines 93-96

```typescript
vehicles: () => {
    utils.vehicle.list.prefetch({ entityId })
    utils.entity.list.prefetch()
},
```

**New `firearms` handler to insert between `artwork` (line 110) and `insurance` (line 111):**

```typescript
firearms: () => {
    utils.firearm.list.prefetch({ entityId })
    utils.entity.list.prefetch()
},
```

Insert after the closing `},` of `artwork` (line 110) and before `insurance: () => {` (line 111).

---

### `src/components/app-sidebar.tsx` — Edit 2: Assets `SidebarMenuSub` block rewrite

**Icon finding:** No icons are used on any `SidebarMenuSubItem` in the Assets group. The only icon in the file (`LogOut`) is in the footer. The Firearms entry uses **no icon** — `<span>Firearms</span>` label only, consistent with all 6 existing items.

**Analog:** `Vehicles` item, lines 414-430 — cleanest single-table item with no special props:

```tsx
<SidebarMenuSubItem>
    <SidebarMenuSubButton
        asChild
        isActive={
            pathname === '/vehicles'
        }
    >
        <Link
            href="/vehicles"
            onMouseEnter={
                prefetch.vehicles
            }
        >
            <span>Vehicles</span>
        </Link>
    </SidebarMenuSubButton>
</SidebarMenuSubItem>
```

**No `prefetch={false}` on `<Link>`** — the existing items do NOT use this prop. The CONTEXT.md example included it but the actual file does not. Match the file, not the CONTEXT.md example.

**Current block (lines 379-485) — 6 items in current order:**

```
1. Properties   — pathname === '/properties'   — prefetch.properties
2. Accounts     — pathname === '/accounts'     — prefetch.accounts
3. Vehicles     — pathname === '/vehicles'     — prefetch.vehicles
4. Personal Property — pathname === '/personal-property' — prefetch.personalProperty
5. Artwork      — pathname === '/artwork'      — prefetch.artwork
6. Insurance    — pathname === '/insurance'    — prefetch.insurance
```

**Target block — 7 items in final alphabetical order:**

```
1. Accounts        — pathname === '/accounts'          — prefetch.accounts
2. Artwork         — pathname === '/artwork'           — prefetch.artwork
3. Firearms (NEW)  — pathname === '/firearms'          — prefetch.firearms
4. Insurance       — pathname === '/insurance'         — prefetch.insurance
5. Personal Property — pathname === '/personal-property' — prefetch.personalProperty
6. Properties      — pathname === '/properties'        — prefetch.properties
7. Vehicles        — pathname === '/vehicles'          — prefetch.vehicles
```

**Recommended approach: single block rewrite (option a).** All 6 existing items move; 5 targeted edits would produce identical churn with more risk of merge-ordering errors. Replace the entire `<SidebarMenuSub>…</SidebarMenuSub>` span (lines 379-485) in one Edit call.

**Full replacement block (copy verbatim, modify only as noted):**

```tsx
<SidebarMenuSub>
    <SidebarMenuSubItem>
        <SidebarMenuSubButton
            asChild
            isActive={
                pathname === '/accounts'
            }
        >
            <Link
                href="/accounts"
                onMouseEnter={
                    prefetch.accounts
                }
            >
                <span>Accounts</span>
            </Link>
        </SidebarMenuSubButton>
    </SidebarMenuSubItem>
    <SidebarMenuSubItem>
        <SidebarMenuSubButton
            asChild
            isActive={
                pathname === '/artwork'
            }
        >
            <Link
                href="/artwork"
                onMouseEnter={
                    prefetch.artwork
                }
            >
                <span>Artwork</span>
            </Link>
        </SidebarMenuSubButton>
    </SidebarMenuSubItem>
    <SidebarMenuSubItem>
        <SidebarMenuSubButton
            asChild
            isActive={
                pathname === '/firearms'
            }
        >
            <Link
                href="/firearms"
                onMouseEnter={
                    prefetch.firearms
                }
            >
                <span>Firearms</span>
            </Link>
        </SidebarMenuSubButton>
    </SidebarMenuSubItem>
    <SidebarMenuSubItem>
        <SidebarMenuSubButton
            asChild
            isActive={
                pathname === '/insurance'
            }
        >
            <Link
                href="/insurance"
                onMouseEnter={
                    prefetch.insurance
                }
            >
                <span>Insurance</span>
            </Link>
        </SidebarMenuSubButton>
    </SidebarMenuSubItem>
    <SidebarMenuSubItem>
        <SidebarMenuSubButton
            asChild
            isActive={
                pathname ===
                '/personal-property'
            }
        >
            <Link
                href="/personal-property"
                onMouseEnter={
                    prefetch.personalProperty
                }
            >
                <span>
                    Personal Property
                </span>
            </Link>
        </SidebarMenuSubButton>
    </SidebarMenuSubItem>
    <SidebarMenuSubItem>
        <SidebarMenuSubButton
            asChild
            isActive={
                pathname === '/properties'
            }
        >
            <Link
                href="/properties"
                onMouseEnter={
                    prefetch.properties
                }
            >
                <span>Properties</span>
            </Link>
        </SidebarMenuSubButton>
    </SidebarMenuSubItem>
    <SidebarMenuSubItem>
        <SidebarMenuSubButton
            asChild
            isActive={
                pathname === '/vehicles'
            }
        >
            <Link
                href="/vehicles"
                onMouseEnter={
                    prefetch.vehicles
                }
            >
                <span>Vehicles</span>
            </Link>
        </SidebarMenuSubButton>
    </SidebarMenuSubItem>
</SidebarMenuSub>
```

---

## Shared Patterns

No cross-cutting shared patterns apply beyond the file itself. Auth, error handling, and validation are not involved in this change — it is pure JSX reordering + one new prefetch key.

---

## No Analog Found

None. The file is its own analog for both edits.

---

## Metadata

**Analog search scope:** `src/components/app-sidebar.tsx` (self-contained; no external analogs needed)
**Files scanned:** 1
**Pattern extraction date:** 2026-05-22
