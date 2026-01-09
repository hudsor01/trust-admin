# Trust Administration System - Getting Started

## Starting the System

```bash
cd /Users/richard/Developer/trust-admin

# Start PostgreSQL container
docker compose up -d

# Run migrations (first time only)
bun run db:migrate

# Open Drizzle Studio (web-based admin UI)
bun run studio
```

Then open https://local.drizzle.studio in your browser.

**No internet required** - everything runs locally.

---

## Inserting Data via Drizzle Studio

### 1. Create Entities First

Entities are the legal structures that own assets (trusts, LLCs, etc.)

1. Click **Entity** in the left sidebar
2. Click **Add record**
3. Fill in:
   - `name`: The trust or entity name
   - `entityType`: Select from dropdown (TRUST, LLC, etc.)
   - `status`: ACTIVE
4. Click **Save 1 change**

### 2. Add Beneficiaries

1. Click **Beneficiary** in the left sidebar
2. Click **Add record**
3. Fill in:
   - `firstName`, `lastName`
   - `relationship`: "Son", "Daughter", "Grandchild"
   - `sharePercent`: Their percentage (optional)
4. Click **Save 1 change**

### 3. Add Assets

Each asset type has its own table. Link assets to entities.

**Vehicles:**
1. Click **Vehicle**
2. Click **Add record**
3. Fill in year, make, model, VIN
4. Select the owning `entity` from dropdown
5. Save

**Rental Properties:**
1. Click **RentalProperty**
2. Add address, property type, rental status
3. Link to owning entity
4. Save

**Bank Accounts:**
1. Click **BankAccount**
2. Add institution, account type, account number
3. Link to owning entity
4. Save

### 4. Record Distributions

When you pay a beneficiary:

1. Click **Distribution**
2. Click **Add record**
3. Select the `beneficiary`
4. Enter `distributionDate`, `amount`, `distributionType`
5. Add `sourceDescription`: "Q1 2024 rental income"
6. Select `paymentMethod`
7. Save

### 5. Track Valuations

Record asset values over time:

1. Click **Valuation**
2. Link to the asset (vehicle, property, account, etc.)
3. Enter `valuationDate`, `value`, `valuationType`
4. Add `source`: "Zillow", "Bank statement", "Appraisal"
5. Save

---

## Stopping the System

```bash
# Stop containers (data is preserved)
docker compose down
```

---

## Useful Commands

```bash
# Check container status
docker compose ps

# View database logs
docker compose logs postgres

# Run a backup manually
docker compose exec backup /backup.sh

# Open PostgreSQL shell
docker exec -it trust-admin-db psql -U trust_admin -d trust_admin
```

---

## Data Entry Order (Recommended)

1. **Entity** - Create trusts and LLCs first
2. **Beneficiary** - Add all 19 beneficiaries
3. **Contact** - Add attorneys, accountants, property managers
4. **Assets** - Vehicles, properties, accounts, policies
5. **Valuations** - Current values for each asset
6. **Documents** - Link files to assets/entities
7. **Distributions** - Record payments to beneficiaries
