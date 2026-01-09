# Asset CRUD Pages Design

**Date:** 2025-01-03
**Status:** Approved

## Overview

Add full CRUD functionality for trust assets through dedicated pages with consistent UI patterns. Schema is the single source of truth - all UI fields map exactly to schema columns.

## Navigation Restructure

```
Overview:
  - Dashboard

Administration:
  - People (expandable)
      ├── Trustees
      ├── Beneficiaries
      └── Contacts
  - Distributions (expandable)
      ├── HEMS Requests
      └── Specific Bequests

Financial:
  - Trust Accounting
  - Assets (expandable)
      ├── Properties
      ├── Accounts
      └── Vehicles
```

## New Pages

### 1. Properties Page (`/properties`)

Two tabs: Homestead | Rental Properties

#### Homestead Tab
Single homestead per trust. Card display if exists, "Add" button if not.

**Schema fields:**
- streetAddress (required), city (required), state (required), zip (required)
- county, parcelNumber, legalDescription
- propertyType (enum, required): SINGLE_FAMILY, MULTI_FAMILY, CONDO, TOWNHOUSE, LAND, COMMERCIAL, MOBILE_HOME
- yearBuilt, squareFeet, lotSizeAcres, bedrooms, bathrooms
- acquisitionDate, acquisitionCost
- dodValue, dodValueDate, dodValueType
- dodAffidavitFiled, dodAffidavitDate, clerkFileNo
- status (enum, required): ACTIVE, SOLD, TRANSFERRED, DISPOSED
- transferStatus (enum, required): PENDING, STARTED, COMPLETE
- notes

#### Rental Properties Tab
Table with multiple rentals. Add/Edit/Delete via modal.

**Additional fields beyond homestead:**
- name (required)
- units
- rentalStatus (enum): RENTED, VACANT, UNDER_RENOVATION, LISTED
- monthlyRent, leaseStart, leaseEnd
- propertyManager
- mortgageBalance

### 2. Accounts Page (`/accounts`)

Two tabs: Bank Accounts | Investment Accounts

#### Bank Accounts Tab
**Schema fields:**
- institution (required), accountType (enum, required), accountName
- accountNumber (required), routingNumber
- dodValue, dodValueDate
- status (enum, required): OPEN, CLOSED, FROZEN
- transferStatus (enum, required): PENDING, STARTED, COMPLETE
- notes

**Account types:** CHECKING, SAVINGS, CD, MONEY_MARKET, BUSINESS_CHECKING, BUSINESS_SAVINGS

#### Investment Accounts Tab
**Schema fields:**
- institution (required), accountType (enum, required), accountName
- accountNumber (required)
- dodValue, dodValueDate, costBasis
- status (enum, required): OPEN, CLOSED, FROZEN
- transferStatus (enum, required): PENDING, STARTED, COMPLETE
- notes

**Account types:** BROKERAGE, IRA_TRADITIONAL, IRA_ROTH, K401, ANNUITY, HSA, FIVE29, OTHER

### 3. Vehicles Page (`/vehicles`)

Single table, no tabs. Add/Edit/Delete via modal.

**Schema fields:**
- year (required), make (required), model (required)
- vin (required, unique)
- color, licensePlate, mileage
- titleStatus (enum, required): CLEAR, LIEN, PENDING_TRANSFER
- acquisitionDate, acquisitionCost
- dodValue, dodValueDate, dodValueType
- status (enum, required): ACTIVE, SOLD, TRANSFERRED, DISPOSED
- transferStatus (enum, required): PENDING, STARTED, COMPLETE
- notes

## Shared UI Patterns

### Modal Structure
1. Primary identifiers (name/address)
2. Details (type, specs)
3. Acquisition info
4. DOD valuation section
5. Status fields
6. Notes (always last)

Footer: [Cancel] [Save]

### Form Fields
- Required fields: Red asterisk, validated on submit
- Enums: Select dropdown
- Dates: Mantine DateInput
- Currency: NumberInput with $ prefix, 2 decimals

### Status Badge Colors
- PENDING/OPEN/ACTIVE → gray
- STARTED/RENTED → yellow
- COMPLETE/TRANSFERRED → green
- CLOSED/SOLD → blue
- FROZEN/LIEN → red

### Table Patterns
- Sortable columns
- Search/filter input top-right
- "Add [Asset]" button top-right
- Row actions: Edit, Delete (with confirm)
- Empty state message

### API Pattern
- `GET /api/[resource]?entityId=X`
- `POST /api/[resource]`
- `PUT /api/[resource]/:id`
- `DELETE /api/[resource]/:id`

## Seed Data

**Homestead:** 1301 Cherry Hill Ln, Lewisville, TX 75067 (Denton County)

## Implementation Order

1. Update navigation (App.tsx) with nested NavLinks
2. Create Properties page with Homestead + Rental tabs
3. Create Accounts page with Bank + Investment tabs
4. Create Vehicles page
5. Add homestead seed data
6. Remove old Assets.tsx
