CREATE TYPE "public"."AccountStatus" AS ENUM('OPEN', 'CLOSED', 'FROZEN');--> statement-breakpoint
CREATE TYPE "public"."AllocationClass" AS ENUM('PRINCIPAL', 'INCOME');--> statement-breakpoint
CREATE TYPE "public"."AssetStatus" AS ENUM('ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED');--> statement-breakpoint
CREATE TYPE "public"."BankAccountType" AS ENUM('CHECKING', 'SAVINGS', 'CD', 'MONEY_MARKET', 'BUSINESS_CHECKING', 'BUSINESS_SAVINGS');--> statement-breakpoint
CREATE TYPE "public"."ContactRole" AS ENUM('ATTORNEY', 'ACCOUNTANT', 'FINANCIAL_ADVISOR', 'PROPERTY_MANAGER', 'TENANT', 'INSURANCE_AGENT', 'BANKER', 'CONTRACTOR', 'EMPLOYEE', 'BENEFICIARY_REP', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."DistributionStandard" AS ENUM('HEMS', 'HEMS_PLUS_WITHDRAWAL', 'BROADER', 'WITHDRAWAL_ONLY');--> statement-breakpoint
CREATE TYPE "public"."DistributionType" AS ENUM('INCOME', 'PRINCIPAL', 'CAPITAL_GAIN', 'EXPENSE_REIMBURSEMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."DocumentType" AS ENUM('DEED', 'TITLE', 'STATEMENT', 'CONTRACT', 'LEASE', 'TAX_RETURN', 'APPRAISAL', 'INSURANCE_POLICY', 'LICENSE', 'REGISTRATION', 'RECEIPT', 'INVOICE', 'CHECK_COPY', 'CORRESPONDENCE', 'TRUST_DOCUMENT', 'OPERATING_AGREEMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."DodValueType" AS ENUM('APPRAISAL', 'STATEMENT', 'MARKET_ESTIMATE', 'TAX_ASSESSED');--> statement-breakpoint
CREATE TYPE "public"."EntityStatus" AS ENUM('ACTIVE', 'DISSOLVED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."EntityType" AS ENUM('TRUST', 'LLC', 'CORPORATION', 'PARTNERSHIP', 'INDIVIDUAL');--> statement-breakpoint
CREATE TYPE "public"."ExpenseType" AS ENUM('TAX', 'INSURANCE', 'MAINTENANCE', 'REPAIR', 'PROFESSIONAL_FEE', 'TRUSTEE_FEE', 'FILING_FEE', 'UTILITY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."HemsCategory" AS ENUM('HEALTH', 'EDUCATION', 'MAINTENANCE', 'SUPPORT', 'WITHDRAWAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."HemsRequestStatus" AS ENUM('PENDING', 'APPROVED', 'DENIED', 'DISTRIBUTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."IncomeType" AS ENUM('DIVIDEND', 'INTEREST', 'RENT', 'ROYALTY', 'CAPITAL_GAIN', 'SALE_PROCEEDS', 'DISTRIBUTION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."InsurancePolicyType" AS ENUM('LIFE', 'PROPERTY', 'AUTO', 'UMBRELLA', 'LIABILITY', 'HEALTH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."InvestmentAccountType" AS ENUM('BROKERAGE', 'IRA_TRADITIONAL', 'IRA_ROTH', 'K401', 'ANNUITY', 'HSA', 'FIVE29', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."LiabilityStatus" AS ENUM('ACTIVE', 'PAID_OFF', 'DISPUTED', 'WRITTEN_OFF');--> statement-breakpoint
CREATE TYPE "public"."LiabilityType" AS ENUM('MORTGAGE', 'LOAN', 'CREDIT_CARD', 'TAX_OWED', 'ACCOUNTS_PAYABLE', 'LEGAL_JUDGMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."LogAction" AS ENUM('INSERT', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('CHECK', 'ACH', 'WIRE', 'CASH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."PersonalPropertyCategory" AS ENUM('JEWELRY', 'ART', 'COLLECTIBLES', 'FURNITURE', 'EQUIPMENT', 'ELECTRONICS', 'TOOLS', 'FIREARMS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."PolicyStatus" AS ENUM('ACTIVE', 'LAPSED', 'CANCELLED', 'CLAIMED');--> statement-breakpoint
CREATE TYPE "public"."PremiumFrequency" AS ENUM('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');--> statement-breakpoint
CREATE TYPE "public"."PropertyType" AS ENUM('SINGLE_FAMILY', 'MULTI_FAMILY', 'CONDO', 'TOWNHOUSE', 'LAND', 'COMMERCIAL', 'MOBILE_HOME');--> statement-breakpoint
CREATE TYPE "public"."RelationshipType" AS ENUM('CHILD', 'STEPCHILD', 'GRANDCHILD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."RentalStatus" AS ENUM('RENTED', 'VACANT', 'UNDER_RENOVATION', 'LISTED');--> statement-breakpoint
CREATE TYPE "public"."TaskCategory" AS ENUM('INVENTORY', 'FINANCIAL', 'BENEFICIARY', 'LEGAL', 'ADMINISTRATIVE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."TitleStatus" AS ENUM('CLEAR', 'LIEN', 'PENDING_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."TransactionType" AS ENUM('INCOME', 'EXPENSE', 'TRANSFER', 'CAPITAL_IMPROVEMENT', 'DEPRECIATION');--> statement-breakpoint
CREATE TYPE "public"."TransferStatus" AS ENUM('PENDING', 'STARTED', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "public"."TrustType" AS ENUM('REVOCABLE', 'IRREVOCABLE');--> statement-breakpoint
CREATE TYPE "public"."TrusteeFeeStatus" AS ENUM('ACCRUED', 'APPROVED', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."TrusteeStatus" AS ENUM('CURRENT', 'SUCCESSOR', 'ARBITOR', 'RESIGNED', 'REMOVED', 'DECEASED');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('admin', 'beneficiary');--> statement-breakpoint
CREATE TYPE "public"."ValuationType" AS ENUM('APPRAISAL', 'MARKET_ESTIMATE', 'TAX_ASSESSED', 'STATEMENT_BALANCE', 'PURCHASE_PRICE', 'BOOK_VALUE', 'SELF_ASSESSED');--> statement-breakpoint
CREATE TYPE "public"."WithdrawalStatus" AS ENUM('ELIGIBLE', 'PARTIAL', 'COMPLETE', 'NOT_YET_ELIGIBLE');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ActivityLog" (
	"id" text PRIMARY KEY NOT NULL,
	"tableName" text NOT NULL,
	"recordId" text NOT NULL,
	"action" "LogAction" NOT NULL,
	"oldValues" jsonb,
	"newValues" jsonb,
	"changedBy" text DEFAULT 'system' NOT NULL,
	"ipAddress" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Artwork" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"title" text NOT NULL,
	"artist" text,
	"medium" text,
	"dimensions" text,
	"acquisitionDate" timestamp(3),
	"acquisitionCost" numeric(12, 2),
	"location" text,
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3),
	"dodValueType" "DodValueType",
	"transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"status" "AssetStatus" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BankAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"institution" text NOT NULL,
	"accountType" "BankAccountType" NOT NULL,
	"accountName" text,
	"accountNumber" text NOT NULL,
	"routingNumber" text,
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3),
	"currentBalance" numeric(14, 2),
	"currentBalanceDate" timestamp(3),
	"status" "AccountStatus" DEFAULT 'OPEN' NOT NULL,
	"transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Beneficiary" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"relationship" text NOT NULL,
	"relationshipType" "RelationshipType",
	"parentId" text,
	"dob" timestamp(3),
	"email" text,
	"phone" text,
	"streetAddress" text,
	"city" text,
	"state" text,
	"zip" text,
	"taxId" text,
	"sharePercent" numeric(5, 2),
	"distributionStandard" "DistributionStandard",
	"withdrawalAge1" integer,
	"withdrawalPct1" integer,
	"withdrawalAge2" integer,
	"withdrawalPct2" integer,
	"hasSupplementalNeedsTrust" boolean DEFAULT false,
	"isPrimary" boolean DEFAULT true,
	"isContingent" boolean DEFAULT false,
	"informed" boolean DEFAULT false,
	"informedDate" timestamp(3),
	"releaseSigned" boolean DEFAULT false,
	"releaseDate" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Contact" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"role" "ContactRole" NOT NULL,
	"email" text,
	"phone" text,
	"dob" timestamp(3),
	"streetAddress" text,
	"city" text,
	"state" text,
	"zip" text,
	"licenseNo" text,
	"barNo" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ContactAssociation" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"entityId" text,
	"relationship" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Distribution" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text,
	"beneficiaryId" text NOT NULL,
	"distributionDate" timestamp(3) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"distributionType" "DistributionType" NOT NULL,
	"hemsCategory" "HemsCategory",
	"hemsJustification" text,
	"isWithdrawal" boolean DEFAULT false,
	"withdrawalPercent" integer,
	"sourceDescription" text,
	"checkNumber" text,
	"paymentMethod" "PaymentMethod" NOT NULL,
	"taxReported" boolean DEFAULT false NOT NULL,
	"tax1099Issued" boolean DEFAULT false NOT NULL,
	"documentId" text,
	"supportingDocPath" text,
	"approvedBy" text,
	"approvalDate" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Document" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"documentType" "DocumentType" NOT NULL,
	"filePath" text NOT NULL,
	"entityId" text,
	"vehicleId" text,
	"homesteadId" text,
	"rentalPropertyId" text,
	"bankAccountId" text,
	"investmentAccountId" text,
	"insurancePolicyId" text,
	"personalPropertyId" text,
	"documentDate" timestamp(3),
	"expirationDate" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Entity" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"entityType" "EntityType" NOT NULL,
	"trustType" "TrustType",
	"grantorName" text,
	"decedent" text,
	"dod" timestamp(3),
	"originalDate" timestamp(3),
	"restatedDate" timestamp(3),
	"governingLaw" text,
	"hasNoContestClause" boolean DEFAULT false,
	"hasSpendthriftProvision" boolean DEFAULT false,
	"ein" text,
	"formationDate" timestamp(3),
	"stateOfFormation" text,
	"registeredAgent" text,
	"parentEntityId" text,
	"status" "EntityStatus" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "HemsRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"beneficiaryId" text NOT NULL,
	"entityId" text NOT NULL,
	"category" "HemsCategory" NOT NULL,
	"amountRequested" numeric(14, 2) NOT NULL,
	"justification" text NOT NULL,
	"supportingDocPath" text,
	"status" "HemsRequestStatus" DEFAULT 'PENDING' NOT NULL,
	"reviewedBy" text,
	"reviewedAt" timestamp(3),
	"reviewNotes" text,
	"approvedAmount" numeric(14, 2),
	"distributionId" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Homestead" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"streetAddress" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"county" text,
	"parcelNumber" text,
	"legalDescription" text,
	"propertyType" "PropertyType" NOT NULL,
	"yearBuilt" integer,
	"squareFeet" integer,
	"lotSizeAcres" numeric(10, 4),
	"bedrooms" integer,
	"bathrooms" numeric(3, 1),
	"acquisitionDate" timestamp(3),
	"acquisitionCost" numeric(12, 2),
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3),
	"dodValueType" "DodValueType",
	"dodAffidavitFiled" boolean DEFAULT false,
	"dodAffidavitDate" timestamp(3),
	"clerkFileNo" text,
	"status" "AssetStatus" DEFAULT 'ACTIVE' NOT NULL,
	"transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InsurancePolicy" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"policyType" "InsurancePolicyType" NOT NULL,
	"carrier" text NOT NULL,
	"policyNumber" text NOT NULL,
	"coverageAmount" numeric(12, 2),
	"premium" numeric(10, 2),
	"premiumFrequency" "PremiumFrequency",
	"effectiveDate" timestamp(3),
	"expirationDate" timestamp(3),
	"insuredAsset" text,
	"beneficiaries" text,
	"status" "PolicyStatus" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InvestmentAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"institution" text NOT NULL,
	"accountType" "InvestmentAccountType" NOT NULL,
	"accountName" text,
	"accountNumber" text NOT NULL,
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3),
	"costBasis" numeric(14, 2),
	"currentBalance" numeric(14, 2),
	"currentBalanceDate" timestamp(3),
	"status" "AccountStatus" DEFAULT 'OPEN' NOT NULL,
	"transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Liability" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"liabilityType" "LiabilityType" NOT NULL,
	"creditor" text NOT NULL,
	"description" text,
	"originalAmount" numeric(14, 2) NOT NULL,
	"currentBalance" numeric(14, 2) NOT NULL,
	"currentBalanceDate" timestamp(3),
	"interestRate" numeric(5, 3),
	"monthlyPayment" numeric(12, 2),
	"dueDate" timestamp(3),
	"paymentDueDay" integer,
	"rentalPropertyId" text,
	"homesteadId" text,
	"vehicleId" text,
	"status" "LiabilityStatus" DEFAULT 'ACTIVE' NOT NULL,
	"allocationClass" "AllocationClass" DEFAULT 'PRINCIPAL',
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "LiabilityPayment" (
	"id" text PRIMARY KEY NOT NULL,
	"liabilityId" text NOT NULL,
	"paymentDate" timestamp(3) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"principalPortion" numeric(12, 2),
	"interestPortion" numeric(12, 2),
	"escrowPortion" numeric(12, 2),
	"paymentMethod" "PaymentMethod",
	"checkNumber" text,
	"confirmationNumber" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PersonalProperty" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "PersonalPropertyCategory" NOT NULL,
	"location" text,
	"acquisitionDate" timestamp(3),
	"acquisitionCost" numeric(12, 2),
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3),
	"dodValueType" "DodValueType",
	"status" "AssetStatus" DEFAULT 'ACTIVE' NOT NULL,
	"transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RentalProperty" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"name" text NOT NULL,
	"streetAddress" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"county" text,
	"parcelNumber" text,
	"propertyType" "PropertyType" NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"squareFeet" integer,
	"lotSizeAcres" numeric(10, 4),
	"yearBuilt" integer,
	"rentalStatus" "RentalStatus" DEFAULT 'RENTED' NOT NULL,
	"monthlyRent" numeric(10, 2),
	"leaseStart" timestamp(3),
	"leaseEnd" timestamp(3),
	"propertyManager" text,
	"acquisitionDate" timestamp(3),
	"acquisitionCost" numeric(12, 2),
	"mortgageBalance" numeric(12, 2),
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3),
	"dodValueType" "DodValueType",
	"dodAffidavitFiled" boolean DEFAULT false,
	"dodAffidavitDate" timestamp(3),
	"clerkFileNo" text,
	"status" "AssetStatus" DEFAULT 'ACTIVE' NOT NULL,
	"transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "SpecificBequest" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"beneficiaryId" text,
	"description" text NOT NULL,
	"category" text,
	"recipientName" text,
	"dateDistributed" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Task" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" "TaskCategory" DEFAULT 'OTHER' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"dueDate" timestamp(3),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicleId" text,
	"homesteadId" text,
	"rentalPropertyId" text,
	"bankAccountId" text,
	"investmentAccountId" text,
	"insurancePolicyId" text,
	"transactionDate" timestamp(3) NOT NULL,
	"transactionType" "TransactionType" NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"vendor" text,
	"checkNumber" text,
	"documentId" text,
	"allocationClass" "AllocationClass" DEFAULT 'PRINCIPAL',
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TrustAccounting" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"accountingDate" timestamp(3) NOT NULL,
	"entryType" text NOT NULL,
	"incomeType" "IncomeType",
	"expenseType" "ExpenseType",
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"sourceAssetType" text,
	"sourceAssetId" text,
	"isPrincipal" boolean DEFAULT false,
	"taxDeductible" boolean DEFAULT false,
	"documentPath" text,
	"vendor" text,
	"checkNumber" text,
	"reconciled" boolean DEFAULT false,
	"reconciledDate" timestamp(3),
	"fiscalYear" integer,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Trustee" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"contactId" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"dob" timestamp(3),
	"status" "TrusteeStatus" DEFAULT 'CURRENT',
	"order" integer NOT NULL,
	"isCo" boolean DEFAULT false,
	"coTrusteeId" text,
	"startDate" timestamp(3),
	"endDate" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TrusteeFeeEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"trusteeId" text NOT NULL,
	"scheduleId" text,
	"periodStart" timestamp(3) NOT NULL,
	"periodEnd" timestamp(3) NOT NULL,
	"assetFee" numeric(14, 2) DEFAULT '0',
	"assetBasis" numeric(14, 2),
	"incomeFee" numeric(14, 2) DEFAULT '0',
	"incomeBasis" numeric(14, 2),
	"hoursWorked" numeric(6, 2) DEFAULT '0',
	"hourlyFee" numeric(14, 2) DEFAULT '0',
	"executorFee" numeric(14, 2) DEFAULT '0',
	"totalFee" numeric(14, 2) NOT NULL,
	"status" "TrusteeFeeStatus" DEFAULT 'ACCRUED' NOT NULL,
	"paidDate" timestamp(3),
	"paymentMethod" "PaymentMethod",
	"checkNumber" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TrusteeFeeSchedule" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"trusteeId" text NOT NULL,
	"executorFeePercent" numeric(5, 2) DEFAULT '5.0',
	"annualAssetPercent" numeric(5, 2) DEFAULT '1.5',
	"incomePercent" numeric(5, 2) DEFAULT '8.0',
	"hourlyRate" numeric(10, 2) DEFAULT '125.00',
	"effectiveDate" timestamp(3) NOT NULL,
	"endDate" timestamp(3),
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" "UserRole" DEFAULT 'beneficiary' NOT NULL,
	"beneficiary_id" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "Valuation" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicleId" text,
	"homesteadId" text,
	"rentalPropertyId" text,
	"bankAccountId" text,
	"investmentAccountId" text,
	"personalPropertyId" text,
	"artworkId" text,
	"valuationDate" timestamp(3) NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"valuationType" "ValuationType" NOT NULL,
	"source" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Vehicle" (
	"id" text PRIMARY KEY NOT NULL,
	"entityId" text NOT NULL,
	"year" integer NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"vin" text NOT NULL,
	"color" text,
	"titleStatus" "TitleStatus" DEFAULT 'CLEAR' NOT NULL,
	"licensePlate" text,
	"mileage" integer,
	"acquisitionDate" timestamp(3),
	"acquisitionCost" numeric(12, 2),
	"dodValue" numeric(14, 2),
	"dodValueDate" timestamp(3),
	"dodValueType" "DodValueType",
	"status" "AssetStatus" DEFAULT 'ACTIVE' NOT NULL,
	"transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WithdrawalRecord" (
	"id" text PRIMARY KEY NOT NULL,
	"beneficiaryId" text NOT NULL,
	"entityId" text NOT NULL,
	"withdrawalType" text NOT NULL,
	"eligibleDate" timestamp(3) NOT NULL,
	"eligibleAmount" numeric(14, 2) NOT NULL,
	"withdrawnAmount" numeric(14, 2) DEFAULT '0',
	"remainingAmount" numeric(14, 2),
	"status" "WithdrawalStatus" DEFAULT 'NOT_YET_ELIGIBLE',
	"exercisedDate" timestamp(3),
	"distributionId" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Beneficiary"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactAssociation" ADD CONSTRAINT "ContactAssociation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ContactAssociation" ADD CONSTRAINT "ContactAssociation_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "public"."Beneficiary"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_homesteadId_fkey" FOREIGN KEY ("homesteadId") REFERENCES "public"."Homestead"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_rentalPropertyId_fkey" FOREIGN KEY ("rentalPropertyId") REFERENCES "public"."RentalProperty"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_investmentAccountId_fkey" FOREIGN KEY ("investmentAccountId") REFERENCES "public"."InvestmentAccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_insurancePolicyId_fkey" FOREIGN KEY ("insurancePolicyId") REFERENCES "public"."InsurancePolicy"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_personalPropertyId_fkey" FOREIGN KEY ("personalPropertyId") REFERENCES "public"."PersonalProperty"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "public"."Entity"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "HemsRequest" ADD CONSTRAINT "HemsRequest_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "public"."Beneficiary"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "HemsRequest" ADD CONSTRAINT "HemsRequest_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "HemsRequest" ADD CONSTRAINT "HemsRequest_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "public"."Distribution"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Homestead" ADD CONSTRAINT "Homestead_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "InvestmentAccount" ADD CONSTRAINT "InvestmentAccount_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_rentalPropertyId_fkey" FOREIGN KEY ("rentalPropertyId") REFERENCES "public"."RentalProperty"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_homesteadId_fkey" FOREIGN KEY ("homesteadId") REFERENCES "public"."Homestead"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "LiabilityPayment" ADD CONSTRAINT "LiabilityPayment_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "public"."Liability"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PersonalProperty" ADD CONSTRAINT "PersonalProperty_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RentalProperty" ADD CONSTRAINT "RentalProperty_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpecificBequest" ADD CONSTRAINT "SpecificBequest_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SpecificBequest" ADD CONSTRAINT "SpecificBequest_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "public"."Beneficiary"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_homesteadId_fkey" FOREIGN KEY ("homesteadId") REFERENCES "public"."Homestead"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_rentalPropertyId_fkey" FOREIGN KEY ("rentalPropertyId") REFERENCES "public"."RentalProperty"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_investmentAccountId_fkey" FOREIGN KEY ("investmentAccountId") REFERENCES "public"."InvestmentAccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_insurancePolicyId_fkey" FOREIGN KEY ("insurancePolicyId") REFERENCES "public"."InsurancePolicy"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TrustAccounting" ADD CONSTRAINT "TrustAccounting_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Trustee" ADD CONSTRAINT "Trustee_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Trustee" ADD CONSTRAINT "Trustee_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Trustee" ADD CONSTRAINT "Trustee_coTrusteeId_fkey" FOREIGN KEY ("coTrusteeId") REFERENCES "public"."Trustee"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TrusteeFeeEntry" ADD CONSTRAINT "TrusteeFeeEntry_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TrusteeFeeEntry" ADD CONSTRAINT "TrusteeFeeEntry_trusteeId_fkey" FOREIGN KEY ("trusteeId") REFERENCES "public"."Trustee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TrusteeFeeEntry" ADD CONSTRAINT "TrusteeFeeEntry_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."TrusteeFeeSchedule"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TrusteeFeeSchedule" ADD CONSTRAINT "TrusteeFeeSchedule_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "TrusteeFeeSchedule" ADD CONSTRAINT "TrusteeFeeSchedule_trusteeId_fkey" FOREIGN KEY ("trusteeId") REFERENCES "public"."Trustee"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_beneficiaryId_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."Beneficiary"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_homesteadId_fkey" FOREIGN KEY ("homesteadId") REFERENCES "public"."Homestead"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_rentalPropertyId_fkey" FOREIGN KEY ("rentalPropertyId") REFERENCES "public"."RentalProperty"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_investmentAccountId_fkey" FOREIGN KEY ("investmentAccountId") REFERENCES "public"."InvestmentAccount"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_personalPropertyId_fkey" FOREIGN KEY ("personalPropertyId") REFERENCES "public"."PersonalProperty"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "public"."Artwork"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WithdrawalRecord" ADD CONSTRAINT "WithdrawalRecord_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "public"."Beneficiary"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WithdrawalRecord" ADD CONSTRAINT "WithdrawalRecord_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "public"."Entity"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WithdrawalRecord" ADD CONSTRAINT "WithdrawalRecord_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "public"."Distribution"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "Beneficiary_taxId_key" ON "Beneficiary" USING btree ("taxId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle" USING btree ("vin" text_ops);