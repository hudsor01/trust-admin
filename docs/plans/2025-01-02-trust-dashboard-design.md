# Trust Dashboard Design

**Date:** 2025-01-02
**Status:** Approved
**User Role:** Successor Trustee & Executor (early stage)

---

## Overview

A task-first web dashboard for managing trust administration. Designed for a single trustee in the early inventory phase, with desktop as primary device and mobile for quick lookups.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Bun HTML imports |
| UI Library | Mantine |
| Tables | TanStack Table |
| Styling | Tailwind CSS |
| Backend | Bun.serve() REST API (existing) |
| Database | PostgreSQL + Drizzle ORM |
| Port | 5050 (frontend + API combined) |

---

## Pages

### 1. Dashboard (`/`)

**Purpose:** Task checklist with progress tracking

**Layout:**
- Header: Trust name + quick stats (`X assets | Y tasks remaining | Z% complete`)
- Main: Task checklist grouped by category
- Sidebar (desktop): Progress ring, recent assets, upcoming deadlines

**Task Categories:**
- Inventory & Documentation
- Financial
- Beneficiary
- Legal/Administrative

**Interactions:**
- Check task → auto-saves, updates progress
- Click task → expands with notes field and linked assets/contacts
- Add custom tasks inline

---

### 2. Assets (`/assets`)

**Purpose:** All trust assets in a filterable table

**Filter Bar:**
- Segmented control: `All | Vehicles | Properties | Units | Accounts | Artwork | Personal`
- Search box

**Asset Types:**
| Type | Description |
|------|-------------|
| Vehicle | Cars, trucks, boats, etc. |
| Property | Raw land, vacant lots |
| Unit | Rental income property (SFH, duplex, apartment) |
| Account | Bank accounts + investment accounts |
| Artwork | Art, collectibles with distinct value |
| Personal | Jewelry, furniture, other personal property |

**Table Columns:**
| Type | Description | Value | Status | Updated |

**Status Indicators:**
- Complete (transferred/retitled)
- Started (in progress)
- Pending (not started)

**Row Click:** Opens detail drawer/modal with:
- Full asset details
- Valuation history
- Related documents
- Related contacts
- Notes section
- Actions: Edit, Add Valuation, Link Document

---

### 3. Beneficiaries (`/beneficiaries`)

**Purpose:** Beneficiary list with distribution tracking

**Summary Bar:**
- Total beneficiaries count
- Total distributed to date
- Pending distributions

**Table Columns:**
| Name | Relationship | Share % | Distributed | Status |

**Row Click → Modal:**
```
┌──────────────────────────────────────────────┐
│  [Name]                                 ✕    │
├──────────────────────────────────────────────┤
│  Relationship: [type]                        │
│  Share: [X]%                                 │
│                                              │
│  Email: email@example.com  [Copy] <- mailto: │
│  Phone: 555-1234           [Copy] <- tel:    │
│  Address: [Address]                          │
│                                              │
│  ─── Distribution History ───                │
│  [Date]   [Amount]   [Method]   [Notes]      │
│                                              │
│  [ Record Distribution ]  [ Edit ]           │
└──────────────────────────────────────────────┘
```

**Features:**
- Email link opens default mail client (mailto:)
- Phone link opens dialer on mobile (tel:)
- Copy button next to each for desktop users

---

### 4. Contacts (`/contacts`)

**Purpose:** Professional contacts (attorneys, CPAs, bank reps, agents)

**Filter Bar:**
- Search box
- Filter by role: `All | Attorney | CPA | Financial | Insurance | Other`

**Table Columns:**
| Name | Role | Company | Phone |

**Row Click → Modal:**
```
┌──────────────────────────────────────────────┐
│  [Name]                                 ✕    │
├──────────────────────────────────────────────┤
│  Role: [role]                                │
│  Company: [company]                          │
│                                              │
│  Email: email@example.com  [Copy]            │
│  Phone: 555-1234           [Copy]            │
│  Address: [Address]                          │
│                                              │
│  ─── Notes ───                               │
│  [Free text notes]                           │
│                                              │
│  [ Edit ]                                    │
└──────────────────────────────────────────────┘
```

---

## Schema Additions

### New Tables

**tasks**
```
id, title, category, completed, notes, dueDate, order, createdAt, updatedAt
```

**artwork**
```
id, entityId, title, artist, medium, dimensions, acquisitionDate,
acquisitionPrice, currentValue, location, notes, createdAt, updatedAt
```

**unit** (rename rentalProperty or create new)
```
id, entityId, address, city, state, zip, propertyType (SFH/duplex/apartment),
bedrooms, bathrooms, sqft, monthlyRent, currentValue, notes, createdAt, updatedAt
```

### Field Additions

**Add to all asset tables:**
- `status` enum: 'pending' | 'started' | 'complete'

---

## UI Patterns

| Pattern | Usage |
|---------|-------|
| Table (TanStack) | Assets, Beneficiaries, Contacts |
| Modal (Mantine) | Detail views for beneficiaries & contacts |
| Segmented Control | Asset type filtering |
| Checkbox Group | Task checklist |
| Progress Ring | Overall completion on dashboard |

---

## Not In Scope (v1)

- Authentication (local use only)
- Document upload/storage
- Email sending from app
- Mobile-specific layouts (responsive but desktop-first)
- Multi-trust support
- Beneficiary portal

---

## Next Steps

1. Add schema changes (tasks, artwork, unit tables + status fields)
2. Run migrations
3. Set up frontend project structure
4. Build pages incrementally: Dashboard → Assets → Beneficiaries → Contacts
