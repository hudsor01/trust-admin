-- Baseline schema for fresh DB installs. Idempotent via
-- IF NOT EXISTS + DO $$ ... EXCEPTION duplicate_object $$ wrappers, so
-- re-running on a DB that already has this state is a no-op. Generated
-- from a pg_dump --schema-only of the reference dev DB and hand-sanitized
-- (see scripts/... -- or the commit that introduced this file for details).
--
-- On fresh Neon branches: `bun run db:migrate` applies this baseline
-- followed by any migrations newer than it. On existing DBs: this file
-- re-applies cleanly because every DDL is guarded.

-- Extensions. pg_trgm is used by trigram indexes in this baseline
-- (idx_*_name_trgm / _creditor_trgm / _description_trgm). pgcrypto
-- gives us gen_random_uuid() used by inventory_analysis_cache. Both are
-- Neon-provisioned extensions that must be enabled before any dependent
-- DDL runs.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint

-- `app` schema + RLS helpers. Referenced by every policy in this
-- baseline. Language is plpgsql (not sql) so function bodies are parsed
-- lazily at call time rather than eagerly at CREATE time — lets us
-- create the helpers BEFORE the user_profile table below, and tolerates
-- the auth.user_id() reference on fresh DBs that don't have Neon
-- Authorize enabled yet (Authorize installs the `auth` schema at a
-- later provisioning step).
CREATE SCHEMA IF NOT EXISTS app;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.effective_user_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.test_user_id', true), ''),
        auth.user_id()
    );
END;
$function$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profile
        WHERE user_profile.user_id = app.effective_user_id()
        AND user_profile.role = 'admin'
    );
END;
$function$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.get_user_beneficiary_id()
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $function$
DECLARE
    v_beneficiary_id bigint;
BEGIN
    SELECT beneficiary_id INTO v_beneficiary_id FROM user_profile
    WHERE user_id = app.effective_user_id();
    RETURN v_beneficiary_id;
END;
$function$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.set_test_user(p_user_id text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM set_config('app.test_user_id', p_user_id, false);
END;
$function$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.clear_test_user()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM set_config('app.test_user_id', '', false);
END;
$function$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."AccountingEntryType" AS ENUM (
    'INCOME',
    'EXPENSE'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."AllocationClass" AS ENUM (
    'PRINCIPAL',
    'INCOME'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."DistributionStandard" AS ENUM (
    'HEMS',
    'HEMS_PLUS_WITHDRAWAL',
    'BROADER',
    'WITHDRAWAL_ONLY'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."DistributionType" AS ENUM (
    'INCOME',
    'PRINCIPAL',
    'CAPITAL_GAIN',
    'EXPENSE_REIMBURSEMENT',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."DocumentType" AS ENUM (
    'DEED',
    'TITLE',
    'STATEMENT',
    'CONTRACT',
    'LEGAL',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."EntityType" AS ENUM (
    'TRUST',
    'LLC',
    'CORPORATION',
    'PARTNERSHIP',
    'INDIVIDUAL'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."ExpenseType" AS ENUM (
    'TAX',
    'INSURANCE',
    'MAINTENANCE',
    'REPAIR',
    'PROFESSIONAL_FEE',
    'TRUSTEE_FEE',
    'FILING_FEE',
    'UTILITY',
    'LEGAL',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."HemsRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'DENIED',
    'DISTRIBUTED',
    'CANCELLED'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."IncomeType" AS ENUM (
    'DIVIDEND',
    'INTEREST',
    'RENT',
    'ROYALTY',
    'CAPITAL_GAIN',
    'SALE_PROCEEDS',
    'DISTRIBUTION',
    'INCOME_TO_PRINCIPAL_CONVERSION',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."InsurancePolicyType" AS ENUM (
    'LIFE',
    'PROPERTY',
    'AUTO',
    'UMBRELLA',
    'LIABILITY',
    'HEALTH',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."ItemCondition" AS ENUM (
    'excellent',
    'good',
    'fair',
    'poor'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."LiabilityType" AS ENUM (
    'MORTGAGE',
    'LOAN',
    'CREDIT_CARD',
    'TAX_OWED',
    'ACCOUNTS_PAYABLE',
    'LEGAL_JUDGMENT',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."LogAction" AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'SIGN_IN',
    'SIGN_OUT',
    'FAILED_AUTH',
    'ACCESS_DENIED'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."PaymentMethod" AS ENUM (
    'CHECK',
    'ACH',
    'WIRE',
    'CASH',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."PersonalPropertyCategory" AS ENUM (
    'JEWELRY',
    'ART',
    'COLLECTIBLES',
    'ELECTRONICS',
    'FURNITURE',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."PremiumFrequency" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'SEMI_ANNUAL',
    'ANNUAL'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."PropertyType" AS ENUM (
    'SINGLE_FAMILY',
    'MULTI_FAMILY',
    'CONDO',
    'TOWNHOUSE',
    'LAND',
    'COMMERCIAL',
    'MOBILE_HOME'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."RecordStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'OPEN',
    'PENDING',
    'CLOSED',
    'FROZEN',
    'SOLD',
    'TRANSFERRED',
    'DISPOSED',
    'PAID_OFF',
    'PAST_DUE',
    'COLLECTIONS',
    'DISPUTED',
    'WRITTEN_OFF',
    'LAPSED',
    'CANCELLED',
    'CLAIMED',
    'DISSOLVED'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."RelationshipType" AS ENUM (
    'CHILD',
    'STEPCHILD',
    'GRANDCHILD',
    'OTHER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."RentalStatus" AS ENUM (
    'RENTED',
    'VACANT',
    'UNDER_RENOVATION',
    'LISTED'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."SubmissionStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."TitleStatus" AS ENUM (
    'CLEAR',
    'LIEN',
    'PENDING_TRANSFER'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."TransactionType" AS ENUM (
    'INCOME',
    'EXPENSE',
    'TRANSFER',
    'CAPITAL_IMPROVEMENT',
    'DEPRECIATION'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."TransferStatus" AS ENUM (
    'PENDING',
    'STARTED',
    'COMPLETE'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."TrustType" AS ENUM (
    'REVOCABLE',
    'IRREVOCABLE'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."TrusteeFeeStatus" AS ENUM (
    'ACCRUED',
    'APPROVED',
    'PAID'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."TrusteeStatus" AS ENUM (
    'ACTIVE',
    'SUCCESSOR',
    'ARBITER',
    'RESIGNED',
    'REMOVED',
    'DECEASED'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."UserRole" AS ENUM (
    'admin',
    'beneficiary'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."ValuationType" AS ENUM (
    'APPRAISAL',
    'MARKET_ESTIMATE',
    'TAX_ASSESSED',
    'STATEMENT_BALANCE',
    'PURCHASE_PRICE',
    'BOOK_VALUE',
    'SELF_ASSESSED',
    'STATEMENT'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

DO $bootstrap_type$ BEGIN
CREATE TYPE public."WithdrawalStatus" AS ENUM (
    'ELIGIBLE',
    'PARTIAL',
    'COMPLETE',
    'NOT_YET_ELIGIBLE'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_type$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN INSERT INTO public.user_profile (user_id, role, created_at, updated_at) VALUES (NEW.id::text, 'beneficiary', NOW(), NOW()) ON CONFLICT (user_id) DO NOTHING; RETURN NEW; END; $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.account (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.activity_log (
    id bigint NOT NULL,
    "tableName" text NOT NULL,
    "recordId" text NOT NULL,
    action public."LogAction" NOT NULL,
    "oldValues" jsonb,
    "newValues" jsonb,
    "changedBy" text DEFAULT 'system'::text NOT NULL,
    "ipAddress" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.activity_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activity_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.artwork (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    title text NOT NULL,
    artist text,
    medium text,
    dimensions text,
    "acquisitionDate" timestamp(3) with time zone,
    "acquisitionCost" numeric(12,2),
    location text,
    "dodValue" numeric(14,2),
    "dodValueDate" timestamp(3) with time zone,
    "dodValueType" public."ValuationType",
    "transferStatus" public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.artwork ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.artwork_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.bank_account (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    institution text NOT NULL,
    "accountType" text NOT NULL,
    "accountName" text,
    "accountNumber" text NOT NULL,
    "routingNumber" text,
    "dodValue" numeric(14,2),
    "dodValueDate" timestamp(3) with time zone,
    "currentBalance" numeric(14,2),
    "currentBalanceDate" timestamp(3) with time zone,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    "transferStatus" public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

ALTER TABLE ONLY public.bank_account FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.bank_account ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bank_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.beneficiary (
    id bigint NOT NULL,
    "entityId" bigint,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    relationship text NOT NULL,
    "relationshipType" public."RelationshipType",
    "parentId" bigint,
    dob timestamp(3) with time zone,
    email text,
    phone text,
    "streetAddress" text,
    city text,
    state text,
    zip text,
    "taxId" text,
    "sharePercent" numeric(5,2),
    "distributionStandard" public."DistributionStandard",
    "withdrawalAge1" integer,
    "withdrawalPct1" integer,
    "withdrawalAge2" integer,
    "withdrawalPct2" integer,
    "hasSupplementalNeedsTrust" boolean DEFAULT false,
    "isPrimary" boolean DEFAULT true,
    "isContingent" boolean DEFAULT false,
    informed boolean DEFAULT false,
    "informedDate" timestamp(3) with time zone,
    "releaseSigned" boolean DEFAULT false,
    "releaseDate" timestamp(3) with time zone,
    "deceasedDate" timestamp(3) with time zone,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    full_name text GENERATED ALWAYS AS ((("firstName" || ' '::text) || "lastName")) STORED
);
--> statement-breakpoint

ALTER TABLE ONLY public.beneficiary FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.beneficiary ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.beneficiary_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.contact (
    id bigint NOT NULL,
    name text NOT NULL,
    company text,
    role text NOT NULL,
    email text,
    phone text,
    dob timestamp(3) with time zone,
    "streetAddress" text,
    city text,
    state text,
    zip text,
    "licenseNo" text,
    "barNo" text,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.contact_association (
    id bigint NOT NULL,
    "contactId" bigint NOT NULL,
    "entityId" bigint,
    relationship text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.contact_association ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contact_association_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.contact ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.distribution (
    id bigint NOT NULL,
    "entityId" bigint,
    "beneficiaryId" bigint NOT NULL,
    "distributionDate" timestamp(3) with time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    "distributionType" public."DistributionType" NOT NULL,
    "hemsCategory" text,
    "hemsJustification" text,
    "isWithdrawal" boolean DEFAULT false,
    "withdrawalPercent" integer,
    "sourceDescription" text,
    "checkNumber" text,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "taxReported" boolean DEFAULT false NOT NULL,
    "tax1099Issued" boolean DEFAULT false NOT NULL,
    "documentId" bigint,
    "supportingDocPath" text,
    "approvedBy" text,
    "approvalDate" timestamp(3) with time zone,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

ALTER TABLE ONLY public.distribution FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.distribution ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.distribution_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.document (
    id bigint NOT NULL,
    name text NOT NULL,
    "documentType" public."DocumentType" NOT NULL,
    "filePath" text NOT NULL,
    "entityId" bigint,
    "vehicleId" bigint,
    "homesteadId" bigint,
    "rentalPropertyId" bigint,
    "bankAccountId" bigint,
    "investmentAccountId" bigint,
    "insurancePolicyId" bigint,
    "personalPropertyId" bigint,
    "documentDate" timestamp(3) with time zone,
    "expirationDate" timestamp(3) with time zone,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    CONSTRAINT document_single_owner_check CHECK (((((((((
CASE
    WHEN ("entityId" IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN ("vehicleId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("homesteadId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("rentalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("bankAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("investmentAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("insurancePolicyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("personalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) = 1))
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.document ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.entity (
    id bigint NOT NULL,
    name text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "trustType" public."TrustType",
    "grantorName" text,
    decedent text,
    dod timestamp(3) with time zone,
    "originalDate" timestamp(3) with time zone,
    "restatedDate" timestamp(3) with time zone,
    "governingLaw" text,
    "hasNoContestClause" boolean DEFAULT false,
    "hasSpendthriftProvision" boolean DEFAULT false,
    ein text,
    "formationDate" timestamp(3) with time zone,
    "stateOfFormation" text,
    "registeredAgent" text,
    "parentEntityId" bigint,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "ownershipPercent" numeric(5,2),
    "dodValue" numeric(14,2),
    "dodValueDate" timestamp(3) with time zone
);
--> statement-breakpoint

ALTER TABLE ONLY public.entity FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.entity ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.entity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.hems_request (
    id bigint NOT NULL,
    "beneficiaryId" bigint NOT NULL,
    "entityId" bigint NOT NULL,
    category text NOT NULL,
    "amountRequested" numeric(14,2) NOT NULL,
    justification text NOT NULL,
    "supportingDocPath" text,
    status public."HemsRequestStatus" DEFAULT 'PENDING'::public."HemsRequestStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) with time zone,
    "reviewNotes" text,
    "approvedAmount" numeric(14,2),
    "distributionId" bigint,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

ALTER TABLE ONLY public.hems_request FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.hems_request ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.hems_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.homestead (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "streetAddress" text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip text NOT NULL,
    county text,
    "parcelNumber" text,
    "legalDescription" text,
    "propertyType" public."PropertyType" NOT NULL,
    "yearBuilt" integer,
    "squareFeet" integer,
    "lotSizeAcres" numeric(10,4),
    bedrooms integer,
    bathrooms numeric(3,1),
    "acquisitionDate" timestamp(3) with time zone,
    "acquisitionCost" numeric(12,2),
    "dodValue" numeric(14,2),
    "dodValueDate" timestamp(3) with time zone,
    "dodValueType" public."ValuationType",
    "dodAffidavitFiled" boolean DEFAULT false,
    "dodAffidavitDate" timestamp(3) with time zone,
    "clerkFileNo" text,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    "transferStatus" public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

ALTER TABLE ONLY public.homestead FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.homestead ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.homestead_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.insurance_policy (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "policyType" public."InsurancePolicyType" NOT NULL,
    carrier text NOT NULL,
    "policyNumber" text NOT NULL,
    "coverageAmount" numeric(12,2),
    premium numeric(10,2),
    "premiumFrequency" public."PremiumFrequency",
    "effectiveDate" timestamp(3) with time zone,
    "expirationDate" timestamp(3) with time zone,
    "insuredAsset" text,
    beneficiaries text,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.insurance_policy ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.insurance_policy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.inventory_analysis_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "analysisJson" jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) with time zone DEFAULT (CURRENT_TIMESTAMP + '24:00:00'::interval) NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.investment_account (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    institution text NOT NULL,
    "accountType" text NOT NULL,
    "accountName" text,
    "accountNumber" text NOT NULL,
    "dodValue" numeric(14,2),
    "dodValueDate" timestamp(3) with time zone,
    "costBasis" numeric(14,2),
    "currentBalance" numeric(14,2),
    "currentBalanceDate" timestamp(3) with time zone,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    "transferStatus" public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

ALTER TABLE ONLY public.investment_account FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.investment_account ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.investment_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.liability (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "liabilityType" public."LiabilityType" NOT NULL,
    creditor text NOT NULL,
    description text,
    "originalAmount" numeric(14,2) NOT NULL,
    "currentBalance" numeric(14,2) NOT NULL,
    "currentBalanceDate" timestamp(3) with time zone,
    "interestRate" numeric(5,3),
    "monthlyPayment" numeric(12,2),
    "dueDate" timestamp(3) with time zone,
    "paymentDueDay" integer,
    "loanTermMonths" integer,
    "loanStartDate" timestamp(3) with time zone,
    "escrowMonthly" numeric(12,2),
    "isRevolvingCredit" boolean DEFAULT false NOT NULL,
    "rentalPropertyId" bigint,
    "homesteadId" bigint,
    "vehicleId" bigint,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    "allocationClass" public."AllocationClass" DEFAULT 'PRINCIPAL'::public."AllocationClass",
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    effective_balance numeric(14,2) GENERATED ALWAYS AS (("currentBalance" * ((1)::numeric + COALESCE("interestRate", (0)::numeric)))) STORED
);
--> statement-breakpoint

ALTER TABLE ONLY public.liability FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.liability ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.liability_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.liability_payment (
    id bigint NOT NULL,
    "liabilityId" bigint NOT NULL,
    "paymentDate" timestamp(3) with time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    "principalPortion" numeric(12,2),
    "interestPortion" numeric(12,2),
    "escrowPortion" numeric(12,2),
    "paymentMethod" public."PaymentMethod",
    "checkNumber" text,
    "confirmationNumber" text,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.liability_payment ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.liability_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.password_reset_token (
    id bigint NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $bootstrap_sequence$ BEGIN
CREATE SEQUENCE public.password_reset_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $bootstrap_sequence$;
--> statement-breakpoint

DO $bootstrap_seq_owned$ BEGIN
ALTER SEQUENCE public.password_reset_token_id_seq OWNED BY public.password_reset_token.id;
EXCEPTION WHEN others THEN NULL;
END $bootstrap_seq_owned$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.pending_inventory_item (
    id bigint NOT NULL,
    name text NOT NULL,
    category public."PersonalPropertyCategory" NOT NULL,
    description text,
    "estimatedValue" numeric(12,2),
    condition public."ItemCondition" NOT NULL,
    "photoPath1" text,
    "photoPath2" text,
    "photoPath3" text,
    "photoPath4" text,
    "photoPath5" text,
    "aiConfidence" text,
    "aiSuggested" boolean DEFAULT false NOT NULL,
    status public."SubmissionStatus" DEFAULT 'PENDING'::public."SubmissionStatus" NOT NULL,
    "reviewNotes" text,
    "approvedAt" timestamp(3) with time zone,
    "approvedById" bigint,
    "entityId" bigint,
    "submitterName" text,
    "submitterEmail" text,
    "submitterPhone" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    "valueRangeLow" numeric(12,2),
    "valueRangeHigh" numeric(12,2),
    "aiBrand" text,
    "aiModel" text,
    "aiEra" text,
    "aiMaterials" text,
    "aiValuationRationale" text,
    "aiConditionNotes" text,
    "aiServerOverrideReasons" text
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.pending_inventory_item ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pending_inventory_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.personal_property (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    name text NOT NULL,
    description text,
    category public."PersonalPropertyCategory" NOT NULL,
    location text,
    "acquisitionDate" timestamp(3) with time zone,
    "acquisitionCost" numeric(12,2),
    "dodValue" numeric(14,2),
    "dodValueDate" timestamp(3) with time zone,
    "dodValueType" public."ValuationType",
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    "transferStatus" public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.personal_property ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.personal_property_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.rental_property (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    name text NOT NULL,
    "streetAddress" text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip text NOT NULL,
    county text,
    "parcelNumber" text,
    "propertyType" public."PropertyType" NOT NULL,
    units integer DEFAULT 1 NOT NULL,
    "squareFeet" integer,
    "lotSizeAcres" numeric(10,4),
    "yearBuilt" integer,
    "rentalStatus" public."RentalStatus" DEFAULT 'RENTED'::public."RentalStatus" NOT NULL,
    "monthlyRent" numeric(10,2),
    "leaseStart" timestamp(3) with time zone,
    "leaseEnd" timestamp(3) with time zone,
    "propertyManager" text,
    "acquisitionDate" timestamp(3) with time zone,
    "acquisitionCost" numeric(12,2),
    "mortgageBalance" numeric(12,2),
    "dodValue" numeric(14,2),
    "dodValueDate" timestamp(3) with time zone,
    "dodValueType" public."ValuationType",
    "dodAffidavitFiled" boolean DEFAULT false,
    "dodAffidavitDate" timestamp(3) with time zone,
    "clerkFileNo" text,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    "transferStatus" public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.rental_property ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.rental_property_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.session (
    id text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.specific_bequest (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "beneficiaryId" bigint,
    description text NOT NULL,
    category text,
    "recipientName" text,
    "dateDistributed" timestamp(3) with time zone,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.specific_bequest ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.specific_bequest_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.task (
    id bigint NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'OTHER'::text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    notes text,
    "dueDate" timestamp(3) with time zone,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.task ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.transaction (
    id bigint NOT NULL,
    "vehicleId" bigint,
    "homesteadId" bigint,
    "rentalPropertyId" bigint,
    "bankAccountId" bigint,
    "investmentAccountId" bigint,
    "insurancePolicyId" bigint,
    "transactionDate" timestamp(3) with time zone NOT NULL,
    "transactionType" public."TransactionType" NOT NULL,
    category text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text,
    vendor text,
    "checkNumber" text,
    "documentId" bigint,
    "allocationClass" public."AllocationClass" DEFAULT 'PRINCIPAL'::public."AllocationClass",
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL,
    CONSTRAINT transaction_single_asset_check CHECK (((((((
CASE
    WHEN ("vehicleId" IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN ("homesteadId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("rentalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("bankAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("investmentAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("insurancePolicyId" IS NOT NULL) THEN 1
    ELSE 0
END) = 1))
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.transaction ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.transaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.trust_accounting (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "accountingDate" timestamp(3) with time zone NOT NULL,
    "entryType" public."AccountingEntryType" NOT NULL,
    "incomeType" public."IncomeType",
    "expenseType" public."ExpenseType",
    amount numeric(14,2) NOT NULL,
    description text NOT NULL,
    "sourceAssetType" text,
    "sourceAssetId" bigint,
    "bankAccountId" bigint NOT NULL,
    "isPrincipal" boolean DEFAULT false,
    "taxDeductible" boolean DEFAULT false,
    "documentPath" text,
    vendor text,
    "checkNumber" text,
    reconciled boolean DEFAULT false,
    "reconciledDate" timestamp(3) with time zone,
    "fiscalYear" integer,
    "convertedToPrincipal" boolean DEFAULT false,
    "conversionDate" timestamp(3) with time zone,
    "conversionEntryId" bigint,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

ALTER TABLE ONLY public.trust_accounting FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.trust_accounting ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trust_accounting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.trustee (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "contactId" bigint,
    name text NOT NULL,
    email text,
    phone text,
    dob timestamp(3) with time zone,
    status public."TrusteeStatus" DEFAULT 'ACTIVE'::public."TrusteeStatus",
    "order" integer NOT NULL,
    "isCo" boolean DEFAULT false,
    "coTrusteeId" bigint,
    "startDate" timestamp(3) with time zone,
    "endDate" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.trustee_fee_entry (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "trusteeId" bigint NOT NULL,
    "scheduleId" bigint,
    "periodStart" timestamp(3) with time zone NOT NULL,
    "periodEnd" timestamp(3) with time zone NOT NULL,
    "assetFee" numeric(14,2) DEFAULT '0'::numeric,
    "assetBasis" numeric(14,2),
    "incomeFee" numeric(14,2) DEFAULT '0'::numeric,
    "incomeBasis" numeric(14,2),
    "hoursWorked" numeric(6,2) DEFAULT '0'::numeric,
    "hourlyFee" numeric(14,2) DEFAULT '0'::numeric,
    "executorFee" numeric(14,2) DEFAULT '0'::numeric,
    "totalFee" numeric(14,2) NOT NULL,
    status public."TrusteeFeeStatus" DEFAULT 'ACCRUED'::public."TrusteeFeeStatus" NOT NULL,
    "paidDate" timestamp(3) with time zone,
    "paymentMethod" public."PaymentMethod",
    "checkNumber" text,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.trustee_fee_entry ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trustee_fee_entry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.trustee_fee_schedule (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "trusteeId" bigint NOT NULL,
    "executorFeePercent" numeric(5,2) DEFAULT 5.0,
    "annualAssetPercent" numeric(5,2) DEFAULT 1.5,
    "incomePercent" numeric(5,2) DEFAULT 8.0,
    "hourlyRate" numeric(10,2) DEFAULT 125.00,
    "effectiveDate" timestamp(3) with time zone NOT NULL,
    "endDate" timestamp(3) with time zone,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.trustee_fee_schedule ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trustee_fee_schedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.trustee ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trustee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role public."UserRole" DEFAULT 'beneficiary'::public."UserRole" NOT NULL,
    beneficiary_id bigint
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.user_profile (
    user_id text NOT NULL,
    role public."UserRole" DEFAULT 'beneficiary'::public."UserRole" NOT NULL,
    beneficiary_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    force_password_change boolean DEFAULT false NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.valuation (
    id bigint NOT NULL,
    "vehicleId" bigint,
    "homesteadId" bigint,
    "rentalPropertyId" bigint,
    "bankAccountId" bigint,
    "investmentAccountId" bigint,
    "personalPropertyId" bigint,
    "artworkId" bigint,
    "valuationDate" timestamp(3) with time zone NOT NULL,
    value numeric(14,2) NOT NULL,
    "valuationType" public."ValuationType" NOT NULL,
    source text,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT valuation_single_asset_check CHECK ((((((((
CASE
    WHEN ("vehicleId" IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN ("homesteadId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("rentalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("bankAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("investmentAccountId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("personalPropertyId" IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN ("artworkId" IS NOT NULL) THEN 1
    ELSE 0
END) = 1))
);
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.valuation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.valuation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.vehicle (
    id bigint NOT NULL,
    "entityId" bigint NOT NULL,
    year integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    vin text NOT NULL,
    color text,
    "titleStatus" public."TitleStatus" DEFAULT 'CLEAR'::public."TitleStatus" NOT NULL,
    "licensePlate" text,
    mileage integer,
    "acquisitionDate" timestamp(3) with time zone,
    "acquisitionCost" numeric(12,2),
    "dodValue" numeric(14,2),
    "dodValueDate" timestamp(3) with time zone,
    "dodValueType" public."ValuationType",
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    "transferStatus" public."TransferStatus" DEFAULT 'PENDING'::public."TransferStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

ALTER TABLE ONLY public.vehicle FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.vehicle ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.vehicle_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.withdrawal_record (
    id bigint NOT NULL,
    "beneficiaryId" bigint NOT NULL,
    "entityId" bigint NOT NULL,
    "withdrawalType" text NOT NULL,
    "eligibleDate" timestamp(3) with time zone NOT NULL,
    "eligibleAmount" numeric(14,2) NOT NULL,
    "withdrawnAmount" numeric(14,2) DEFAULT '0'::numeric,
    "remainingAmount" numeric(14,2),
    status public."WithdrawalStatus" DEFAULT 'NOT_YET_ELIGIBLE'::public."WithdrawalStatus",
    "exercisedDate" timestamp(3) with time zone,
    "distributionId" bigint,
    notes text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint

ALTER TABLE ONLY public.withdrawal_record FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_identity$ BEGIN
ALTER TABLE public.withdrawal_record ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.withdrawal_record_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_column THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END $bootstrap_identity$;
--> statement-breakpoint

ALTER TABLE ONLY public.password_reset_token ALTER COLUMN id SET DEFAULT nextval('public.password_reset_token_id_seq'::regclass);
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.artwork
    ADD CONSTRAINT artwork_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.bank_account
    ADD CONSTRAINT bank_account_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.beneficiary
    ADD CONSTRAINT beneficiary_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.contact_association
    ADD CONSTRAINT contact_association_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.distribution
    ADD CONSTRAINT distribution_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.entity
    ADD CONSTRAINT entity_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.hems_request
    ADD CONSTRAINT hems_request_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.homestead
    ADD CONSTRAINT homestead_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.insurance_policy
    ADD CONSTRAINT insurance_policy_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.inventory_analysis_cache
    ADD CONSTRAINT inventory_analysis_cache_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.investment_account
    ADD CONSTRAINT investment_account_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.liability_payment
    ADD CONSTRAINT liability_payment_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.liability
    ADD CONSTRAINT liability_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_token_key UNIQUE (token);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.pending_inventory_item
    ADD CONSTRAINT pending_inventory_item_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.personal_property
    ADD CONSTRAINT personal_property_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.rental_property
    ADD CONSTRAINT rental_property_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_unique UNIQUE (token);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.specific_bequest
    ADD CONSTRAINT specific_bequest_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trust_accounting
    ADD CONSTRAINT trust_accounting_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee_fee_entry
    ADD CONSTRAINT trustee_fee_entry_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee_fee_schedule
    ADD CONSTRAINT trustee_fee_schedule_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee
    ADD CONSTRAINT trustee_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_pkey PRIMARY KEY (user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.valuation
    ADD CONSTRAINT valuation_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.vehicle
    ADD CONSTRAINT vehicle_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.withdrawal_record
    ADD CONSTRAINT withdrawal_record_pkey PRIMARY KEY (id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "Beneficiary_taxId_key" ON public.beneficiary USING btree ("taxId");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_vin_key" ON public.vehicle USING btree (vin);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log USING btree (action);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log USING btree ("createdAt" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at_brin ON public.activity_log USING brin ("createdAt");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_activity_log_new_values_gin ON public.activity_log USING gin ("newValues");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_activity_log_old_values_gin ON public.activity_log USING gin ("oldValues");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_activity_log_record_id ON public.activity_log USING btree ("recordId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_activity_log_table_record ON public.activity_log USING btree ("tableName", "recordId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_artwork_entity_id ON public.artwork USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_artwork_status ON public.artwork USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_bank_account_entity_id ON public.bank_account USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_bank_account_status ON public.bank_account USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_beneficiary_entity_id ON public.beneficiary USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_beneficiary_name_trgm ON public.beneficiary USING gin (((("firstName" || ' '::text) || "lastName")) public.gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_beneficiary_parent_id ON public.beneficiary USING btree ("parentId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_contact_association_contact_id ON public.contact_association USING btree ("contactId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_contact_association_entity_id ON public.contact_association USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_contact_name_trgm ON public.contact USING gin (name public.gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_distribution_beneficiary_date ON public.distribution USING btree ("beneficiaryId", "distributionDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_distribution_date ON public.distribution USING btree ("distributionDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_distribution_entity_id ON public.distribution USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_document_bank_account_id ON public.document USING btree ("bankAccountId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_document_entity_id ON public.document USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_document_homestead_id ON public.document USING btree ("homesteadId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_document_insurance_policy_id ON public.document USING btree ("insurancePolicyId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_document_investment_account_id ON public.document USING btree ("investmentAccountId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_document_personal_property_id ON public.document USING btree ("personalPropertyId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_document_rental_property_id ON public.document USING btree ("rentalPropertyId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_document_vehicle_id ON public.document USING btree ("vehicleId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_entity_parent_entity_id ON public.entity USING btree ("parentEntityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_entity_status ON public.entity USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_hems_request_beneficiary_status ON public.hems_request USING btree ("beneficiaryId", status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_hems_request_distribution_id ON public.hems_request USING btree ("distributionId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_hems_request_entity_id ON public.hems_request USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_hems_request_status ON public.hems_request USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_homestead_entity_id ON public.homestead USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_homestead_status ON public.homestead USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_insurance_policy_entity_id ON public.insurance_policy USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_insurance_policy_status ON public.insurance_policy USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_inventory_analysis_cache_expires_at ON public.inventory_analysis_cache USING btree ("expiresAt");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_investment_account_entity_id ON public.investment_account USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_investment_account_status ON public.investment_account USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_liability_creditor_trgm ON public.liability USING gin (creditor public.gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_liability_entity_status ON public.liability USING btree ("entityId", status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_liability_payment_date ON public.liability_payment USING btree ("paymentDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_liability_payment_liability_date ON public.liability_payment USING btree ("liabilityId", "paymentDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_liability_status ON public.liability USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_password_reset_token_email ON public.password_reset_token USING btree (email);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_pending_inventory_item_created_at ON public.pending_inventory_item USING btree ("createdAt" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_pending_inventory_item_entity_id ON public.pending_inventory_item USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_pending_inventory_item_status ON public.pending_inventory_item USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_personal_property_entity_id ON public.personal_property USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_personal_property_status ON public.personal_property USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_rental_property_entity_id ON public.rental_property USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_rental_property_status ON public.rental_property USING btree ("rentalStatus");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_session_expires_at ON public.session USING btree (expires_at);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_session_user_id ON public.session USING btree (user_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_specific_bequest_beneficiary_id ON public.specific_bequest USING btree ("beneficiaryId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_specific_bequest_entity_id ON public.specific_bequest USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_task_completed ON public.task USING btree (completed);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_task_due_date ON public.task USING btree ("dueDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_transaction_bank_account_id ON public.transaction USING btree ("bankAccountId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_transaction_date ON public.transaction USING btree ("transactionDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_transaction_homestead_id ON public.transaction USING btree ("homesteadId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_transaction_insurance_policy_id ON public.transaction USING btree ("insurancePolicyId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_transaction_investment_account_id ON public.transaction USING btree ("investmentAccountId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_transaction_rental_property_id ON public.transaction USING btree ("rentalPropertyId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_transaction_vehicle_id ON public.transaction USING btree ("vehicleId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trust_accounting_bank_account ON public.trust_accounting USING btree ("bankAccountId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trust_accounting_created_at_brin ON public.trust_accounting USING brin ("createdAt");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trust_accounting_date ON public.trust_accounting USING btree ("accountingDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trust_accounting_description_trgm ON public.trust_accounting USING gin (description public.gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trust_accounting_entity_date ON public.trust_accounting USING btree ("entityId", "accountingDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trustee_co_trustee_id ON public.trustee USING btree ("coTrusteeId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trustee_contact_id ON public.trustee USING btree ("contactId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trustee_entity_id ON public.trustee USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_trustee_status ON public.trustee USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_valuation_artwork_id ON public.valuation USING btree ("artworkId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_valuation_bank_account_id ON public.valuation USING btree ("bankAccountId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_valuation_date ON public.valuation USING btree ("valuationDate" DESC NULLS LAST);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_valuation_homestead_id ON public.valuation USING btree ("homesteadId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_valuation_investment_account_id ON public.valuation USING btree ("investmentAccountId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_valuation_personal_property_id ON public.valuation USING btree ("personalPropertyId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_valuation_rental_property_id ON public.valuation USING btree ("rentalPropertyId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_valuation_vehicle_id ON public.valuation USING btree ("vehicleId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_vehicle_entity_id ON public.vehicle USING btree ("entityId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_vehicle_status ON public.vehicle USING btree (status);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_withdrawal_record_beneficiary_id ON public.withdrawal_record USING btree ("beneficiaryId");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_withdrawal_record_status ON public.withdrawal_record USING btree (status);
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.artwork
    ADD CONSTRAINT artwork_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.bank_account
    ADD CONSTRAINT bank_account_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.beneficiary
    ADD CONSTRAINT beneficiary_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.beneficiary
    ADD CONSTRAINT beneficiary_parent_id_fkey FOREIGN KEY ("parentId") REFERENCES public.beneficiary(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.contact_association
    ADD CONSTRAINT contact_association_contact_id_fkey FOREIGN KEY ("contactId") REFERENCES public.contact(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.contact_association
    ADD CONSTRAINT contact_association_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.distribution
    ADD CONSTRAINT distribution_beneficiary_id_fkey FOREIGN KEY ("beneficiaryId") REFERENCES public.beneficiary(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.distribution
    ADD CONSTRAINT distribution_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_bank_account_id_fkey FOREIGN KEY ("bankAccountId") REFERENCES public.bank_account(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_homestead_id_fkey FOREIGN KEY ("homesteadId") REFERENCES public.homestead(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_insurance_policy_id_fkey FOREIGN KEY ("insurancePolicyId") REFERENCES public.insurance_policy(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_investment_account_id_fkey FOREIGN KEY ("investmentAccountId") REFERENCES public.investment_account(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_personal_property_id_fkey FOREIGN KEY ("personalPropertyId") REFERENCES public.personal_property(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_rental_property_id_fkey FOREIGN KEY ("rentalPropertyId") REFERENCES public.rental_property(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_vehicle_id_fkey FOREIGN KEY ("vehicleId") REFERENCES public.vehicle(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.entity
    ADD CONSTRAINT entity_parent_entity_id_fkey FOREIGN KEY ("parentEntityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.hems_request
    ADD CONSTRAINT hems_request_beneficiary_id_fkey FOREIGN KEY ("beneficiaryId") REFERENCES public.beneficiary(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.hems_request
    ADD CONSTRAINT hems_request_distribution_id_fkey FOREIGN KEY ("distributionId") REFERENCES public.distribution(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.hems_request
    ADD CONSTRAINT hems_request_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.homestead
    ADD CONSTRAINT homestead_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.insurance_policy
    ADD CONSTRAINT insurance_policy_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.investment_account
    ADD CONSTRAINT investment_account_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.liability
    ADD CONSTRAINT liability_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.liability
    ADD CONSTRAINT liability_homestead_id_fkey FOREIGN KEY ("homesteadId") REFERENCES public.homestead(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.liability_payment
    ADD CONSTRAINT liability_payment_liability_id_fkey FOREIGN KEY ("liabilityId") REFERENCES public.liability(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.liability
    ADD CONSTRAINT liability_rental_property_id_fkey FOREIGN KEY ("rentalPropertyId") REFERENCES public.rental_property(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.liability
    ADD CONSTRAINT liability_vehicle_id_fkey FOREIGN KEY ("vehicleId") REFERENCES public.vehicle(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.pending_inventory_item
    ADD CONSTRAINT pending_inventory_item_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.personal_property
    ADD CONSTRAINT personal_property_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.rental_property
    ADD CONSTRAINT rental_property_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.specific_bequest
    ADD CONSTRAINT specific_bequest_beneficiary_id_fkey FOREIGN KEY ("beneficiaryId") REFERENCES public.beneficiary(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.specific_bequest
    ADD CONSTRAINT specific_bequest_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_bank_account_id_fkey FOREIGN KEY ("bankAccountId") REFERENCES public.bank_account(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_homestead_id_fkey FOREIGN KEY ("homesteadId") REFERENCES public.homestead(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_insurance_policy_id_fkey FOREIGN KEY ("insurancePolicyId") REFERENCES public.insurance_policy(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_investment_account_id_fkey FOREIGN KEY ("investmentAccountId") REFERENCES public.investment_account(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_rental_property_id_fkey FOREIGN KEY ("rentalPropertyId") REFERENCES public.rental_property(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_vehicle_id_fkey FOREIGN KEY ("vehicleId") REFERENCES public.vehicle(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trust_accounting
    ADD CONSTRAINT trust_accounting_bank_account_id_fkey FOREIGN KEY ("bankAccountId") REFERENCES public.bank_account(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trust_accounting
    ADD CONSTRAINT trust_accounting_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee
    ADD CONSTRAINT trustee_co_trustee_id_fkey FOREIGN KEY ("coTrusteeId") REFERENCES public.trustee(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee
    ADD CONSTRAINT trustee_contact_id_fkey FOREIGN KEY ("contactId") REFERENCES public.contact(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee
    ADD CONSTRAINT trustee_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee_fee_entry
    ADD CONSTRAINT trustee_fee_entry_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee_fee_entry
    ADD CONSTRAINT trustee_fee_entry_schedule_id_fkey FOREIGN KEY ("scheduleId") REFERENCES public.trustee_fee_schedule(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee_fee_entry
    ADD CONSTRAINT trustee_fee_entry_trustee_id_fkey FOREIGN KEY ("trusteeId") REFERENCES public.trustee(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee_fee_schedule
    ADD CONSTRAINT trustee_fee_schedule_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.trustee_fee_schedule
    ADD CONSTRAINT trustee_fee_schedule_trustee_id_fkey FOREIGN KEY ("trusteeId") REFERENCES public.trustee(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiary(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiary(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.valuation
    ADD CONSTRAINT valuation_artwork_id_fkey FOREIGN KEY ("artworkId") REFERENCES public.artwork(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.valuation
    ADD CONSTRAINT valuation_bank_account_id_fkey FOREIGN KEY ("bankAccountId") REFERENCES public.bank_account(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.valuation
    ADD CONSTRAINT valuation_homestead_id_fkey FOREIGN KEY ("homesteadId") REFERENCES public.homestead(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.valuation
    ADD CONSTRAINT valuation_investment_account_id_fkey FOREIGN KEY ("investmentAccountId") REFERENCES public.investment_account(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.valuation
    ADD CONSTRAINT valuation_personal_property_id_fkey FOREIGN KEY ("personalPropertyId") REFERENCES public.personal_property(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.valuation
    ADD CONSTRAINT valuation_rental_property_id_fkey FOREIGN KEY ("rentalPropertyId") REFERENCES public.rental_property(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.valuation
    ADD CONSTRAINT valuation_vehicle_id_fkey FOREIGN KEY ("vehicleId") REFERENCES public.vehicle(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.vehicle
    ADD CONSTRAINT vehicle_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.withdrawal_record
    ADD CONSTRAINT withdrawal_record_beneficiary_id_fkey FOREIGN KEY ("beneficiaryId") REFERENCES public.beneficiary(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.withdrawal_record
    ADD CONSTRAINT withdrawal_record_distribution_id_fkey FOREIGN KEY ("distributionId") REFERENCES public.distribution(id) ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

DO $bootstrap_constraint$ BEGIN
ALTER TABLE ONLY public.withdrawal_record
    ADD CONSTRAINT withdrawal_record_entity_id_fkey FOREIGN KEY ("entityId") REFERENCES public.entity(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
    WHEN invalid_table_definition THEN NULL;
    WHEN syntax_error THEN NULL;
END $bootstrap_constraint$;
--> statement-breakpoint

ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.artwork ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.bank_account ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.beneficiary ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.contact_association ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.activity_log FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.artwork FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.bank_account FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.beneficiary FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.contact FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.contact_association FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.distribution FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.document FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.entity FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.hems_request FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.homestead FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.insurance_policy FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.investment_account FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.liability FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.liability_payment FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.pending_inventory_item FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.personal_property FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.rental_property FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.specific_bequest FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.task FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.transaction FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.trust_accounting FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.trustee FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.trustee_fee_entry FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.trustee_fee_schedule FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.valuation FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.vehicle FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-delete" ON public.withdrawal_record FOR DELETE TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.artwork FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.bank_account FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.beneficiary FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.contact FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.contact_association FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.distribution FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.document FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.entity FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.hems_request FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.homestead FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.insurance_policy FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.investment_account FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.liability FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.liability_payment FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.pending_inventory_item FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.personal_property FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.rental_property FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.specific_bequest FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.task FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.transaction FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.trust_accounting FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.trustee FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.trustee_fee_entry FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.trustee_fee_schedule FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.valuation FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.vehicle FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-insert" ON public.withdrawal_record FOR INSERT TO authenticated WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.activity_log FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.artwork FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.bank_account FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.beneficiary FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (beneficiary.id = app.get_user_beneficiary_id()))));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.contact FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.contact_association FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.distribution FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (distribution."beneficiaryId" = app.get_user_beneficiary_id()))));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.document FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.entity FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.hems_request FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (hems_request."beneficiaryId" = app.get_user_beneficiary_id()))));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.homestead FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.insurance_policy FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.investment_account FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.liability FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.liability_payment FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.pending_inventory_item FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.personal_property FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.rental_property FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.specific_bequest FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.task FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.transaction FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.trust_accounting FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.trustee FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.trustee_fee_entry FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.trustee_fee_schedule FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.valuation FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.vehicle FOR SELECT TO authenticated USING (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-select" ON public.withdrawal_record FOR SELECT TO authenticated USING (( SELECT (app.is_admin() OR (withdrawal_record."beneficiaryId" = app.get_user_beneficiary_id()))));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.activity_log FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.artwork FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.bank_account FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.beneficiary FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.contact FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.contact_association FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.distribution FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.document FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.entity FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.hems_request FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.homestead FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.insurance_policy FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.investment_account FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.liability FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.liability_payment FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.pending_inventory_item FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.personal_property FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.rental_property FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.specific_bequest FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.task FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.transaction FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.trust_accounting FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.trustee FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.trustee_fee_entry FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.trustee_fee_schedule FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.valuation FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.vehicle FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY "crud-authenticated-policy-update" ON public.withdrawal_record FOR UPDATE TO authenticated USING (( SELECT app.is_admin() AS is_admin)) WITH CHECK (( SELECT app.is_admin() AS is_admin));
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

ALTER TABLE public.distribution ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.document ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.entity ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.hems_request ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.homestead ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.insurance_policy ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.investment_account ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.liability ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.liability_payment ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.activity_log FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.artwork FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.beneficiary FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.contact FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.contact_association FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.distribution FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.document FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.entity FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.hems_request FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.insurance_policy FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.liability_payment FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.pending_inventory_item FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.personal_property FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.rental_property FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.specific_bequest FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.task FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.transaction FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.trustee FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.trustee_fee_entry FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.trustee_fee_schedule FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.user_profile FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_delete ON public.valuation FOR DELETE TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.activity_log FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.artwork FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.beneficiary FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.contact FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.contact_association FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.distribution FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.document FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.entity FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.hems_request FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.insurance_policy FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.liability_payment FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.pending_inventory_item FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.personal_property FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.rental_property FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.specific_bequest FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.task FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.transaction FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.trustee FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.trustee_fee_entry FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.trustee_fee_schedule FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.user_profile FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_insert ON public.valuation FOR INSERT TO neondb_owner WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.activity_log FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.artwork FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.beneficiary FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.contact FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.contact_association FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.distribution FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.document FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.entity FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.hems_request FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.insurance_policy FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.liability_payment FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.pending_inventory_item FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.personal_property FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.rental_property FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.specific_bequest FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.task FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.transaction FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.trustee FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.trustee_fee_entry FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.trustee_fee_schedule FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.user_profile FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_select ON public.valuation FOR SELECT TO neondb_owner USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.activity_log FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.artwork FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.beneficiary FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.contact FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.contact_association FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.distribution FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.document FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.entity FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.hems_request FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.insurance_policy FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.liability_payment FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.pending_inventory_item FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.personal_property FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.rental_property FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.specific_bequest FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.task FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.transaction FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.trustee FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.trustee_fee_entry FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.trustee_fee_schedule FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.user_profile FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

DO $bootstrap_policy$ BEGIN
CREATE POLICY owner_update ON public.valuation FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $bootstrap_policy$;
--> statement-breakpoint

ALTER TABLE public.password_reset_token ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.pending_inventory_item ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.personal_property ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.rental_property ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.specific_bequest ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.task ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.transaction ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.trust_accounting ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.trustee ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.trustee_fee_entry ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.trustee_fee_schedule ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.valuation ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.vehicle ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.withdrawal_record ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint


