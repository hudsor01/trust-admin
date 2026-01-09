# Trust Admin Database Schema Reference

## Main Entities

### Entity Table
- `id`: Primary key
- `name`: Trust or entity name
- `entityType`: TRUST, LLC, CORPORATION, PARTNERSHIP, INDIVIDUAL
- `trustType`: REVOCABLE, IRREVOCABLE
- `status`: ACTIVE, DISSOLVED, PENDING

### Beneficiary Table
- `id`: Primary key
- `entityId`: Foreign key to Entity
- `firstName`, `lastName`: Name fields
- `relationship`: Relationship to trust
- `sharePercent`: Percentage share
- `distributionStandard`: HEMS, HEMS_PLUS_WITHDRAWAL, BROADER, WITHDRAWAL_ONLY

### Asset Tables
#### Vehicle
- `id`: Primary key
- `entityId`: Foreign key to Entity
- `year`, `make`, `model`, `vin`: Vehicle identification
- `dodValue`: Date of death value

#### Homestead
- `id`: Primary key
- `entityId`: Foreign key to Entity
- Address and property details
- `dodValue`: Date of death value

#### RentalProperty
- `id`: Primary key
- `entityId`: Foreign key to Entity
- Address and rental details
- `monthlyRent`, `mortgageBalance`
- `dodValue`: Date of death value

#### BankAccount
- `id`: Primary key
- `entityId`: Foreign key to Entity
- Institution and account details
- `currentBalance`, `dodValue`

#### InvestmentAccount
- `id`: Primary key
- `entityId`: Foreign key to Entity
- Institution and account details
- `currentBalance`, `costBasis`, `dodValue`

### Distribution Table
- `id`: Primary key
- `beneficiaryId`: Foreign key to Beneficiary
- `entityId`: Foreign key to Entity
- `distributionDate`, `amount`
- `distributionType`: INCOME, PRINCIPAL, CAPITAL_GAIN, EXPENSE_REIMBURSEMENT, OTHER
- `paymentMethod`: CHECK, ACH, WIRE, CASH, OTHER

### Valuation Table
- Links to various asset types (vehicleId, homesteadId, etc.)
- `valuationDate`, `value`
- `valuationType`: APPRAISAL, MARKET_ESTIMATE, TAX_ASSESSED, STATEMENT_BALANCE, PURCHASE_PRICE, BOOK_VALUE, SELF_ASSESSED

### Task Table
- `id`: Primary key
- `title`, `category`: TASK_CATEGORY enum
- `completed`, `dueDate`
- `notes`

### Trustee Table
- `id`: Primary key
- `entityId`: Foreign key to Entity
- Contact information
- `status`: CURRENT, SUCCESSOR, RESIGNED, REMOVED, DECEASED

### HEMS Request Table
- `id`: Primary key
- `beneficiaryId`, `entityId`: Foreign keys
- `category`: HEMS_CATEGORY enum (HEALTH, EDUCATION, MAINTENANCE, SUPPORT, WITHDRAWAL, OTHER)
- `amountRequested`, `justification`
- `status`: PENDING, APPROVED, DENIED, DISTRIBUTED, CANCELLED

### Liability Table
- `id`: Primary key
- `entityId`: Foreign key to Entity
- `liabilityType`: MORTGAGE, LOAN, CREDIT_CARD, TAX_OWED, ACCOUNTS_PAYABLE, LEGAL_JUDGMENT, OTHER
- `creditor`, `originalAmount`, `currentBalance`
- `status`: ACTIVE, PAID_OFF, DISPUTED, WRITTEN_OFF

### Trustee Fee Tables
#### TrusteeFeeSchedule
- Fee percentages and rates
- `executorFeePercent`, `annualAssetPercent`, `incomePercent`, `hourlyRate`

#### TrusteeFeeEntry
- Actual fee entries with calculated amounts
- `assetFee`, `incomeFee`, `hourlyFee`, `totalFee`
- `status`: ACCRUED, APPROVED, PAID

## Enum Types

### AccountStatus
- OPEN, CLOSED, FROZEN

### AssetStatus
- ACTIVE, SOLD, TRANSFERRED, DISPOSED

### BankAccountType
- CHECKING, SAVINGS, CD, MONEY_MARKET, BUSINESS_CHECKING, BUSINESS_SAVINGS

### ContactRole
- ATTORNEY, ACCOUNTANT, FINANCIAL_ADVISOR, PROPERTY_MANAGER, TENANT, INSURANCE_AGENT, BANKER, CONTRACTOR, EMPLOYEE, BENEFICIARY_REP, OTHER

### DistributionType
- INCOME, PRINCIPAL, CAPITAL_GAIN, EXPENSE_REIMBURSEMENT, OTHER

### EntityStatus
- ACTIVE, DISSOLVED, PENDING

### EntityType
- TRUST, LLC, CORPORATION, PARTNERSHIP, INDIVIDUAL

### TaskCategory
- INVENTORY, FINANCIAL, BENEFICIARY, LEGAL, ADMINISTRATIVE, OTHER

### TrustType
- REVOCABLE, IRREVOCABLE

### HemsCategory
- HEALTH, EDUCATION, MAINTENANCE, SUPPORT, WITHDRAWAL, OTHER

### LiabilityType
- MORTGAGE, LOAN, CREDIT_CARD, TAX_OWED, ACCOUNTS_PAYABLE, LEGAL_JUDGMENT, OTHER

### PaymentMethod
- CHECK, ACH, WIRE, CASH, OTHER

### TransferStatus
- PENDING, STARTED, COMPLETE

### TrusteeStatus
- CURRENT, SUCCESSOR, RESIGNED, REMOVED, DECEASED

### HemsRequestStatus
- PENDING, APPROVED, DENIED, DISTRIBUTED, CANCELLED

### TrusteeFeeStatus
- ACCRUED, APPROVED, PAID

## Relationships
- Entity → Beneficiary (one-to-many)
- Entity → Assets (one-to-many for each asset type)
- Beneficiary → Distribution (one-to-many)
- Beneficiary → HemsRequest (one-to-many)
- Entity → Liability (one-to-many)
- Entity → Trustee (one-to-many)
- Various assets → Valuation (one-to-many)
- Entity → TrusteeFeeSchedule (one-to-many)
- Entity → TrusteeFeeEntry (one-to-many)