import { pgTable, varchar, timestamp, text, integer, jsonb, foreignKey, uniqueIndex, index, numeric, boolean, pgEnum, uuid } from "drizzle-orm/pg-core"
import { sql, type SQL } from "drizzle-orm"

// ============================================
// JSONB Type Definitions
// ============================================
type ActivityLogValues = Record<string, unknown>;

// ============================================
// Enums (PostgreSQL Types)
// ============================================

// Generic status for lifecycle tracking (replaces accountStatus, entityStatus, assetStatus, liabilityStatus, policyStatus)
export const recordStatus = pgEnum("RecordStatus", ['ACTIVE', 'INACTIVE', 'OPEN', 'PENDING', 'CLOSED', 'FROZEN', 'SOLD', 'TRANSFERRED', 'DISPOSED', 'PAID_OFF', 'DISPUTED', 'WRITTEN_OFF', 'LAPSED', 'CANCELLED', 'CLAIMED', 'DISSOLVED'])

// Asset and financial enums
export const distributionType = pgEnum("DistributionType", ['INCOME', 'PRINCIPAL', 'CAPITAL_GAIN', 'EXPENSE_REIMBURSEMENT', 'OTHER'])
export const insurancePolicyType = pgEnum("InsurancePolicyType", ['LIFE', 'PROPERTY', 'AUTO', 'UMBRELLA', 'LIABILITY', 'HEALTH', 'OTHER'])
export const liabilityType = pgEnum("LiabilityType", ['MORTGAGE', 'LOAN', 'CREDIT_CARD', 'TAX_OWED', 'ACCOUNTS_PAYABLE', 'LEGAL_JUDGMENT', 'OTHER'])
export const paymentMethod = pgEnum("PaymentMethod", ['CHECK', 'ACH', 'WIRE', 'CASH', 'OTHER'])
export const premiumFrequency = pgEnum("PremiumFrequency", ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'])
export const propertyType = pgEnum("PropertyType", ['SINGLE_FAMILY', 'MULTI_FAMILY', 'CONDO', 'TOWNHOUSE', 'LAND', 'COMMERCIAL', 'MOBILE_HOME'])
export const rentalStatus = pgEnum("RentalStatus", ['RENTED', 'VACANT', 'UNDER_RENOVATION', 'LISTED'])
export const titleStatus = pgEnum("TitleStatus", ['CLEAR', 'LIEN', 'PENDING_TRANSFER'])
export const valuationType = pgEnum("ValuationType", ['APPRAISAL', 'MARKET_ESTIMATE', 'TAX_ASSESSED', 'STATEMENT_BALANCE', 'PURCHASE_PRICE', 'BOOK_VALUE', 'SELF_ASSESSED', 'STATEMENT'])

// Entity and trust enums
export const entityType = pgEnum("EntityType", ['TRUST', 'LLC', 'CORPORATION', 'PARTNERSHIP', 'INDIVIDUAL'])
export const trustType = pgEnum("TrustType", ['REVOCABLE', 'IRREVOCABLE'])

// Beneficiary and distribution enums
export const relationshipType = pgEnum("RelationshipType", ['CHILD', 'STEPCHILD', 'GRANDCHILD', 'OTHER'])
export const distributionStandard = pgEnum("DistributionStandard", ['HEMS', 'HEMS_PLUS_WITHDRAWAL', 'BROADER', 'WITHDRAWAL_ONLY'])
export const hemsRequestStatus = pgEnum("HemsRequestStatus", ['PENDING', 'APPROVED', 'DENIED', 'DISTRIBUTED', 'CANCELLED'])
export const withdrawalStatus = pgEnum("WithdrawalStatus", ['ELIGIBLE', 'PARTIAL', 'COMPLETE', 'NOT_YET_ELIGIBLE'])

// Trustee enums
export const trusteeStatus = pgEnum("TrusteeStatus", ['CURRENT', 'SUCCESSOR', 'ARBITOR', 'RESIGNED', 'REMOVED', 'DECEASED'])
export const trusteeFeeStatus = pgEnum("TrusteeFeeStatus", ['ACCRUED', 'APPROVED', 'PAID'])

// Accounting enums
export const allocationClass = pgEnum("AllocationClass", ['PRINCIPAL', 'INCOME'])
export const transactionType = pgEnum("TransactionType", ['INCOME', 'EXPENSE', 'TRANSFER', 'CAPITAL_IMPROVEMENT', 'DEPRECIATION'])
export const transferStatus = pgEnum("TransferStatus", ['PENDING', 'STARTED', 'COMPLETE'])

// Auth and logging enums
export const logAction = pgEnum("LogAction", ['INSERT', 'UPDATE', 'DELETE', 'SIGN_IN', 'SIGN_OUT', 'FAILED_AUTH', 'ACCESS_DENIED'])
export const userRole = pgEnum("UserRole", ['admin', 'beneficiary'])

// ============================================
// Activity Log (Audit Trail)
// ============================================

export const activityLog = pgTable("ActivityLog", {
	id: text().primaryKey().notNull(),
	tableName: text().notNull(),
	recordId: text().notNull(),
	action: logAction().notNull(),
	oldValues: jsonb().$type<ActivityLogValues>(),
	newValues: jsonb().$type<ActivityLogValues>(),
	changedBy: text().default('system').notNull(),
	ipAddress: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_activity_log_table_name").on(table.tableName),
	index("idx_activity_log_record_id").on(table.recordId),
	index("idx_activity_log_action").on(table.action),
	index("idx_activity_log_created_at").on(table.createdAt.desc()),
	// BRIN index for append-only sequential data
	index("idx_activity_log_created_at_brin").using("brin", table.createdAt),
	// GIN indexes for JSONB columns
	index("idx_activity_log_old_values_gin").using("gin", table.oldValues),
	index("idx_activity_log_new_values_gin").using("gin", table.newValues),
]);

// ============================================
// Entity (Trust/LLC/etc)
// ============================================

export const entity = pgTable("Entity", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	entityType: entityType().notNull(),
	trustType: trustType(),
	grantorName: text(),
	decedent: text(),
	dod: timestamp({ precision: 3, mode: 'string' }),
	originalDate: timestamp({ precision: 3, mode: 'string' }),
	restatedDate: timestamp({ precision: 3, mode: 'string' }),
	governingLaw: text(),
	hasNoContestClause: boolean().default(false),
	hasSpendthriftProvision: boolean().default(false),
	ein: text(),
	formationDate: timestamp({ precision: 3, mode: 'string' }),
	stateOfFormation: text(),
	registeredAgent: text(),
	parentEntityId: text(),
	status: recordStatus().default('ACTIVE').notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_entity_parent_entity_id").on(table.parentEntityId),
	index("idx_entity_status").on(table.status),
	foreignKey({
			columns: [table.parentEntityId],
			foreignColumns: [table.id],
			name: "Entity_parentEntityId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Assets - Vehicles
// ============================================

export const vehicle = pgTable("Vehicle", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	year: integer().notNull(),
	make: text().notNull(),
	model: text().notNull(),
	vin: text().notNull(),
	color: text(),
	titleStatus: titleStatus().default('CLEAR').notNull(),
	licensePlate: text(),
	mileage: integer(),
	acquisitionDate: timestamp({ precision: 3, mode: 'string' }),
	acquisitionCost: numeric({ precision: 12, scale:  2 }),
	dodValue: numeric({ precision: 14, scale: 2 }),
	dodValueDate: timestamp({ precision: 3, mode: 'string' }),
	dodValueType: valuationType(), // Consolidated - was dodValueType
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	transferStatus: transferStatus().default('PENDING').notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("Vehicle_vin_key").using("btree", table.vin.asc().nullsLast().op("text_ops")),
	index("idx_vehicle_entity_id").on(table.entityId),
	index("idx_vehicle_status").on(table.status),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "Vehicle_entityId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Assets - Homestead
// ============================================

export const homestead = pgTable("Homestead", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	streetAddress: text().notNull(),
	city: text().notNull(),
	state: text().notNull(),
	zip: text().notNull(),
	county: text(),
	parcelNumber: text(),
	legalDescription: text(),
	propertyType: propertyType().notNull(),
	yearBuilt: integer(),
	squareFeet: integer(),
	lotSizeAcres: numeric({ precision: 10, scale:  4 }),
	bedrooms: integer(),
	bathrooms: numeric({ precision: 3, scale:  1 }),
	acquisitionDate: timestamp({ precision: 3, mode: 'string' }),
	acquisitionCost: numeric({ precision: 12, scale:  2 }),
	dodValue: numeric({ precision: 14, scale: 2 }),
	dodValueDate: timestamp({ precision: 3, mode: 'string' }),
	dodValueType: valuationType(), // Consolidated
	dodAffidavitFiled: boolean().default(false),
	dodAffidavitDate: timestamp({ precision: 3, mode: 'string' }),
	clerkFileNo: text(),
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	transferStatus: transferStatus().default('PENDING').notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_homestead_entity_id").on(table.entityId),
	index("idx_homestead_status").on(table.status),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "Homestead_entityId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Assets - Rental Property
// ============================================

export const rentalProperty = pgTable("RentalProperty", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	name: text().notNull(),
	streetAddress: text().notNull(),
	city: text().notNull(),
	state: text().notNull(),
	zip: text().notNull(),
	county: text(),
	parcelNumber: text(),
	propertyType: propertyType().notNull(),
	units: integer().default(1).notNull(),
	squareFeet: integer(),
	lotSizeAcres: numeric({ precision: 10, scale:  4 }),
	yearBuilt: integer(),
	rentalStatus: rentalStatus().default('RENTED').notNull(),
	monthlyRent: numeric({ precision: 10, scale:  2 }),
	leaseStart: timestamp({ precision: 3, mode: 'string' }),
	leaseEnd: timestamp({ precision: 3, mode: 'string' }),
	propertyManager: text(),
	acquisitionDate: timestamp({ precision: 3, mode: 'string' }),
	acquisitionCost: numeric({ precision: 12, scale:  2 }),
	mortgageBalance: numeric({ precision: 12, scale:  2 }),
	dodValue: numeric({ precision: 14, scale: 2 }),
	dodValueDate: timestamp({ precision: 3, mode: 'string' }),
	dodValueType: valuationType(), // Consolidated
	dodAffidavitFiled: boolean().default(false),
	dodAffidavitDate: timestamp({ precision: 3, mode: 'string' }),
	clerkFileNo: text(),
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	transferStatus: transferStatus().default('PENDING').notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_rental_property_entity_id").on(table.entityId),
	index("idx_rental_property_status").on(table.rentalStatus),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "RentalProperty_entityId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Assets - Bank Accounts
// ============================================

export const bankAccount = pgTable("BankAccount", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	institution: text().notNull(),
	accountType: text().notNull(), // Converted from enum - 'CHECKING', 'SAVINGS', 'CD', 'MONEY_MARKET', etc.
	accountName: text(),
	accountNumber: text().notNull(),
	routingNumber: text(),
	dodValue: numeric({ precision: 14, scale: 2 }),
	dodValueDate: timestamp({ precision: 3, mode: 'string' }),
	currentBalance: numeric({ precision: 14, scale: 2 }), // Texas 113.152(4) - cash balance
	currentBalanceDate: timestamp({ precision: 3, mode: 'string' }), // When balance was last verified
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	transferStatus: transferStatus().default('PENDING').notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_bank_account_entity_id").on(table.entityId),
	index("idx_bank_account_status").on(table.status),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "BankAccount_entityId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Assets - Investment Accounts
// ============================================

export const investmentAccount = pgTable("InvestmentAccount", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	institution: text().notNull(),
	accountType: text().notNull(), // Converted from enum - 'BROKERAGE', 'IRA_TRADITIONAL', 'IRA_ROTH', etc.
	accountName: text(),
	accountNumber: text().notNull(),
	dodValue: numeric({ precision: 14, scale: 2 }),
	dodValueDate: timestamp({ precision: 3, mode: 'string' }),
	costBasis: numeric({ precision: 14, scale: 2 }),
	currentBalance: numeric({ precision: 14, scale: 2 }), // Texas 113.152(4) - current value
	currentBalanceDate: timestamp({ precision: 3, mode: 'string' }), // When balance was last verified
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	transferStatus: transferStatus().default('PENDING').notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_investment_account_entity_id").on(table.entityId),
	index("idx_investment_account_status").on(table.status),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "InvestmentAccount_entityId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Assets - Insurance Policies
// ============================================

export const insurancePolicy = pgTable("InsurancePolicy", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	policyType: insurancePolicyType().notNull(),
	carrier: text().notNull(),
	policyNumber: text().notNull(),
	coverageAmount: numeric({ precision: 12, scale:  2 }),
	premium: numeric({ precision: 10, scale:  2 }),
	premiumFrequency: premiumFrequency(),
	effectiveDate: timestamp({ precision: 3, mode: 'string' }),
	expirationDate: timestamp({ precision: 3, mode: 'string' }),
	insuredAsset: text(),
	beneficiaries: text(),
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_insurance_policy_entity_id").on(table.entityId),
	index("idx_insurance_policy_status").on(table.status),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "InsurancePolicy_entityId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Beneficiaries
// ============================================

export const beneficiary = pgTable("Beneficiary", {
	id: text().primaryKey().notNull(),
	entityId: text(),
	firstName: text().notNull(),
	lastName: text().notNull(),
	relationship: text().notNull(),
	relationshipType: relationshipType(),
	parentId: text(),
	dob: timestamp({ precision: 3, mode: 'string' }),
	email: text(),
	phone: text(),
	streetAddress: text(),
	city: text(),
	state: text(),
	zip: text(),
	taxId: text(),
	sharePercent: numeric({ precision: 5, scale: 2 }),
	distributionStandard: distributionStandard(),
	withdrawalAge1: integer(),
	withdrawalPct1: integer(),
	withdrawalAge2: integer(),
	withdrawalPct2: integer(),
	hasSupplementalNeedsTrust: boolean().default(false),
	isPrimary: boolean().default(true),
	isContingent: boolean().default(false),
	informed: boolean().default(false),
	informedDate: timestamp({ precision: 3, mode: 'string' }),
	releaseSigned: boolean().default(false),
	releaseDate: timestamp({ precision: 3, mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	// PostgreSQL 17 generated column - full name for display and search
	fullName: text("full_name").generatedAlwaysAs(
		(): SQL => sql`${beneficiary.firstName} || ' ' || ${beneficiary.lastName}`
	),
}, (table) => [
	index("idx_beneficiary_entity_id").on(table.entityId),
	index("idx_beneficiary_parent_id").on(table.parentId),
	uniqueIndex("Beneficiary_taxId_key").using("btree", table.taxId.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "Beneficiary_entityId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.parentId],
		foreignColumns: [table.id],
		name: "Beneficiary_parentId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Distributions
// ============================================

export const distribution = pgTable("Distribution", {
	id: text().primaryKey().notNull(),
	entityId: text(),
	beneficiaryId: text().notNull(),
	distributionDate: timestamp({ precision: 3, mode: 'string' }).notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	distributionType: distributionType().notNull(),
	hemsCategory: text(), // Converted from enum - 'HEALTH', 'EDUCATION', 'MAINTENANCE', 'SUPPORT', etc.
	hemsJustification: text(),
	isWithdrawal: boolean().default(false),
	withdrawalPercent: integer(),
	sourceDescription: text(),
	checkNumber: text(),
	paymentMethod: paymentMethod().notNull(),
	taxReported: boolean().default(false).notNull(),
	tax1099Issued: boolean().default(false).notNull(),
	documentId: text(),
	supportingDocPath: text(),
	approvedBy: text(),
	approvalDate: timestamp({ precision: 3, mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_distribution_beneficiary_id").on(table.beneficiaryId),
	index("idx_distribution_date").on(table.distributionDate.desc()),
	index("idx_distribution_beneficiary_date").on(table.beneficiaryId, table.distributionDate.desc()),
	foreignKey({
			columns: [table.beneficiaryId],
			foreignColumns: [beneficiary.id],
			name: "Distribution_beneficiaryId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "Distribution_entityId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Valuations
// ============================================

export const valuation = pgTable("Valuation", {
	id: text().primaryKey().notNull(),
	vehicleId: text(),
	homesteadId: text(),
	rentalPropertyId: text(),
	bankAccountId: text(),
	investmentAccountId: text(),
	personalPropertyId: text(),
	artworkId: text(),
	valuationDate: timestamp({ precision: 3, mode: 'string' }).notNull(),
	value: numeric({ precision: 14, scale:  2 }).notNull(),
	valuationType: valuationType().notNull(),
	source: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_valuation_vehicle_id").on(table.vehicleId),
	index("idx_valuation_homestead_id").on(table.homesteadId),
	index("idx_valuation_rental_property_id").on(table.rentalPropertyId),
	index("idx_valuation_bank_account_id").on(table.bankAccountId),
	index("idx_valuation_investment_account_id").on(table.investmentAccountId),
	index("idx_valuation_personal_property_id").on(table.personalPropertyId),
	index("idx_valuation_artwork_id").on(table.artworkId),
	index("idx_valuation_date").on(table.valuationDate.desc()),
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicle.id],
			name: "Valuation_vehicleId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.homesteadId],
			foreignColumns: [homestead.id],
			name: "Valuation_homesteadId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.rentalPropertyId],
			foreignColumns: [rentalProperty.id],
			name: "Valuation_rentalPropertyId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.bankAccountId],
			foreignColumns: [bankAccount.id],
			name: "Valuation_bankAccountId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.investmentAccountId],
			foreignColumns: [investmentAccount.id],
			name: "Valuation_investmentAccountId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.personalPropertyId],
			foreignColumns: [personalProperty.id],
			name: "Valuation_personalPropertyId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.artworkId],
			foreignColumns: [artwork.id],
			name: "Valuation_artworkId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Assets - Personal Property
// ============================================

export const personalProperty = pgTable("PersonalProperty", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(), // Converted from enum - 'JEWELRY', 'ART', 'COLLECTIBLES', etc.
	location: text(),
	acquisitionDate: timestamp({ precision: 3, mode: 'string' }),
	acquisitionCost: numeric({ precision: 12, scale:  2 }),
	dodValue: numeric({ precision: 14, scale: 2 }),
	dodValueDate: timestamp({ precision: 3, mode: 'string' }),
	dodValueType: valuationType(), // Consolidated
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	transferStatus: transferStatus().default('PENDING').notNull(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_personal_property_entity_id").on(table.entityId),
	index("idx_personal_property_status").on(table.status),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "PersonalProperty_entityId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Documents
// ============================================

export const document = pgTable("Document", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	documentType: text().notNull(), // Converted from enum - 'DEED', 'TITLE', 'STATEMENT', etc.
	filePath: text().notNull(),
	entityId: text(),
	vehicleId: text(),
	homesteadId: text(),
	rentalPropertyId: text(),
	bankAccountId: text(),
	investmentAccountId: text(),
	insurancePolicyId: text(),
	personalPropertyId: text(),
	documentDate: timestamp({ precision: 3, mode: 'string' }),
	expirationDate: timestamp({ precision: 3, mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_document_entity_id").on(table.entityId),
	index("idx_document_vehicle_id").on(table.vehicleId),
	index("idx_document_homestead_id").on(table.homesteadId),
	index("idx_document_rental_property_id").on(table.rentalPropertyId),
	index("idx_document_bank_account_id").on(table.bankAccountId),
	index("idx_document_investment_account_id").on(table.investmentAccountId),
	index("idx_document_insurance_policy_id").on(table.insurancePolicyId),
	index("idx_document_personal_property_id").on(table.personalPropertyId),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "Document_entityId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicle.id],
			name: "Document_vehicleId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.homesteadId],
			foreignColumns: [homestead.id],
			name: "Document_homesteadId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.rentalPropertyId],
			foreignColumns: [rentalProperty.id],
			name: "Document_rentalPropertyId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.bankAccountId],
			foreignColumns: [bankAccount.id],
			name: "Document_bankAccountId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.investmentAccountId],
			foreignColumns: [investmentAccount.id],
			name: "Document_investmentAccountId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.insurancePolicyId],
			foreignColumns: [insurancePolicy.id],
			name: "Document_insurancePolicyId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.personalPropertyId],
			foreignColumns: [personalProperty.id],
			name: "Document_personalPropertyId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Transactions
// ============================================

export const transaction = pgTable("Transaction", {
	id: text().primaryKey().notNull(),
	vehicleId: text(),
	homesteadId: text(),
	rentalPropertyId: text(),
	bankAccountId: text(),
	investmentAccountId: text(),
	insurancePolicyId: text(),
	transactionDate: timestamp({ precision: 3, mode: 'string' }).notNull(),
	transactionType: transactionType().notNull(),
	category: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	description: text(),
	vendor: text(),
	checkNumber: text(),
	documentId: text(),
	allocationClass: allocationClass().default('PRINCIPAL'), // Texas 116.152 - Principal vs Income
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_transaction_vehicle_id").on(table.vehicleId),
	index("idx_transaction_homestead_id").on(table.homesteadId),
	index("idx_transaction_rental_property_id").on(table.rentalPropertyId),
	index("idx_transaction_bank_account_id").on(table.bankAccountId),
	index("idx_transaction_investment_account_id").on(table.investmentAccountId),
	index("idx_transaction_insurance_policy_id").on(table.insurancePolicyId),
	index("idx_transaction_date").on(table.transactionDate.desc()),
	foreignKey({
			columns: [table.vehicleId],
			foreignColumns: [vehicle.id],
			name: "Transaction_vehicleId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.homesteadId],
			foreignColumns: [homestead.id],
			name: "Transaction_homesteadId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.rentalPropertyId],
			foreignColumns: [rentalProperty.id],
			name: "Transaction_rentalPropertyId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.bankAccountId],
			foreignColumns: [bankAccount.id],
			name: "Transaction_bankAccountId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.investmentAccountId],
			foreignColumns: [investmentAccount.id],
			name: "Transaction_investmentAccountId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.insurancePolicyId],
			foreignColumns: [insurancePolicy.id],
			name: "Transaction_insurancePolicyId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Contacts
// ============================================

export const contact = pgTable("Contact", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	company: text(),
	role: text().notNull(), // Converted from enum - 'ATTORNEY', 'ACCOUNTANT', 'FINANCIAL_ADVISOR', etc.
	email: text(),
	phone: text(),
	dob: timestamp({ precision: 3, mode: 'string' }),
	streetAddress: text(),
	city: text(),
	state: text(),
	zip: text(),
	licenseNo: text(),
	barNo: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
});

export const contactAssociation = pgTable("ContactAssociation", {
	id: text().primaryKey().notNull(),
	contactId: text().notNull(),
	entityId: text(),
	relationship: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_contact_association_contact_id").on(table.contactId),
	index("idx_contact_association_entity_id").on(table.entityId),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contact.id],
			name: "ContactAssociation_contactId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "ContactAssociation_entityId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Tasks
// ============================================

export const task = pgTable("Task", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	category: text().default('OTHER').notNull(), // Converted from enum - 'INVENTORY', 'FINANCIAL', 'BENEFICIARY', etc.
	completed: boolean().default(false).notNull(),
	notes: text(),
	dueDate: timestamp({ precision: 3, mode: 'string' }),
	sortOrder: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_task_completed").on(table.completed),
	index("idx_task_due_date").on(table.dueDate.desc()),
]);

// ============================================
// Assets - Artwork
// ============================================

export const artwork = pgTable("Artwork", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	title: text().notNull(),
	artist: text(),
	medium: text(),
	dimensions: text(),
	acquisitionDate: timestamp({ precision: 3, mode: 'string' }),
	acquisitionCost: numeric({ precision: 12, scale: 2 }),
	location: text(),
	dodValue: numeric({ precision: 14, scale: 2 }),
	dodValueDate: timestamp({ precision: 3, mode: 'string' }),
	dodValueType: valuationType(), // Consolidated
	transferStatus: transferStatus().default('PENDING').notNull(),
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_artwork_entity_id").on(table.entityId),
	index("idx_artwork_status").on(table.status),
	foreignKey({
			columns: [table.entityId],
			foreignColumns: [entity.id],
			name: "Artwork_entityId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Trustees
// ============================================

export const trustee = pgTable("Trustee", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	contactId: text(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	dob: timestamp({ precision: 3, mode: 'string' }),
	status: trusteeStatus().default('CURRENT'),
	order: integer().notNull(),
	isCo: boolean().default(false),
	coTrusteeId: text(),
	startDate: timestamp({ precision: 3, mode: 'string' }),
	endDate: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_trustee_entity_id").on(table.entityId),
	index("idx_trustee_contact_id").on(table.contactId),
	index("idx_trustee_co_trustee_id").on(table.coTrusteeId),
	index("idx_trustee_status").on(table.status),
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "Trustee_entityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.contactId],
		foreignColumns: [contact.id],
		name: "Trustee_contactId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.coTrusteeId],
		foreignColumns: [table.id],
		name: "Trustee_coTrusteeId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Specific Bequests
// ============================================

export const specificBequest = pgTable("SpecificBequest", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	beneficiaryId: text(),
	description: text().notNull(),
	category: text(),
	recipientName: text(),
	dateDistributed: timestamp({ precision: 3, mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_specific_bequest_entity_id").on(table.entityId),
	index("idx_specific_bequest_beneficiary_id").on(table.beneficiaryId),
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "SpecificBequest_entityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.beneficiaryId],
		foreignColumns: [beneficiary.id],
		name: "SpecificBequest_beneficiaryId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Trust Accounting
// ============================================

export const trustAccounting = pgTable("TrustAccounting", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	accountingDate: timestamp({ precision: 3, mode: 'string' }).notNull(),
	entryType: text().notNull(), // 'INCOME' or 'EXPENSE'
	incomeType: text(), // Converted from enum - 'DIVIDEND', 'INTEREST', 'RENT', etc.
	expenseType: text(), // Converted from enum - 'TAX', 'INSURANCE', 'MAINTENANCE', etc.
	amount: numeric({ precision: 14, scale: 2 }).notNull(),
	description: text().notNull(),
	sourceAssetType: text(), // 'vehicle', 'rentalProperty', 'bankAccount', etc.
	sourceAssetId: text(),
	isPrincipal: boolean().default(false), // Principal vs Income distinction
	taxDeductible: boolean().default(false),
	documentPath: text(),
	vendor: text(),
	checkNumber: text(),
	reconciled: boolean().default(false),
	reconciledDate: timestamp({ precision: 3, mode: 'string' }),
	fiscalYear: integer(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_trust_accounting_entity_id").on(table.entityId),
	index("idx_trust_accounting_date").on(table.accountingDate.desc()),
	index("idx_trust_accounting_entity_date").on(table.entityId, table.accountingDate.desc()),
	// BRIN index for append-only sequential data
	index("idx_trust_accounting_created_at_brin").using("brin", table.createdAt),
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "TrustAccounting_entityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Withdrawal Records
// ============================================

export const withdrawalRecord = pgTable("WithdrawalRecord", {
	id: text().primaryKey().notNull(),
	beneficiaryId: text().notNull(),
	entityId: text().notNull(),
	withdrawalType: text().notNull(), // 'AGE_25', 'AGE_30', 'FULL'
	eligibleDate: timestamp({ precision: 3, mode: 'string' }).notNull(),
	eligibleAmount: numeric({ precision: 14, scale: 2 }).notNull(),
	withdrawnAmount: numeric({ precision: 14, scale: 2 }).default('0'),
	remainingAmount: numeric({ precision: 14, scale: 2 }),
	status: withdrawalStatus().default('NOT_YET_ELIGIBLE'),
	exercisedDate: timestamp({ precision: 3, mode: 'string' }),
	distributionId: text(), // Link to actual distribution if exercised
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_withdrawal_record_beneficiary_id").on(table.beneficiaryId),
	index("idx_withdrawal_record_status").on(table.status),
	foreignKey({
		columns: [table.beneficiaryId],
		foreignColumns: [beneficiary.id],
		name: "WithdrawalRecord_beneficiaryId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "WithdrawalRecord_entityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.distributionId],
		foreignColumns: [distribution.id],
		name: "WithdrawalRecord_distributionId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Liabilities
// ============================================

export const liability = pgTable("Liability", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	liabilityType: liabilityType().notNull(),
	creditor: text().notNull(), // Who is owed
	description: text(),
	originalAmount: numeric({ precision: 14, scale: 2 }).notNull(), // Original debt amount
	currentBalance: numeric({ precision: 14, scale: 2 }).notNull(), // Current outstanding balance
	currentBalanceDate: timestamp({ precision: 3, mode: 'string' }), // When balance was last verified
	interestRate: numeric({ precision: 5, scale: 3 }), // Annual interest rate
	monthlyPayment: numeric({ precision: 12, scale: 2 }),
	dueDate: timestamp({ precision: 3, mode: 'string' }), // Final due date or maturity
	paymentDueDay: integer(), // Day of month payment is due
	// For mortgages - link to property
	rentalPropertyId: text(),
	homesteadId: text(),
	// For vehicle loans
	vehicleId: text(),
	status: recordStatus().default('ACTIVE').notNull(), // Consolidated status
	allocationClass: allocationClass().default('PRINCIPAL'), // Texas 116.152 - Principal vs Income
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	// PostgreSQL 17 generated column - balance with accrued interest
	effectiveBalance: numeric("effective_balance", { precision: 14, scale: 2 }).generatedAlwaysAs(
		(): SQL => sql`${liability.currentBalance} * (1 + COALESCE(${liability.interestRate}, 0))`
	),
}, (table) => [
	index("idx_liability_entity_id").on(table.entityId),
	index("idx_liability_status").on(table.status),
	index("idx_liability_entity_status").on(table.entityId, table.status),
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "Liability_entityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.rentalPropertyId],
		foreignColumns: [rentalProperty.id],
		name: "Liability_rentalPropertyId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.homesteadId],
		foreignColumns: [homestead.id],
		name: "Liability_homesteadId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.vehicleId],
		foreignColumns: [vehicle.id],
		name: "Liability_vehicleId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Liability Payments
// ============================================

export const liabilityPayment = pgTable("LiabilityPayment", {
	id: text().primaryKey().notNull(),
	liabilityId: text().notNull(),
	paymentDate: timestamp({ precision: 3, mode: 'string' }).notNull(),
	amount: numeric({ precision: 12, scale: 2 }).notNull(),
	principalPortion: numeric({ precision: 12, scale: 2 }), // Principal portion of payment
	interestPortion: numeric({ precision: 12, scale: 2 }), // Interest portion of payment
	escrowPortion: numeric({ precision: 12, scale: 2 }), // Escrow portion (taxes, insurance)
	paymentMethod: paymentMethod(),
	checkNumber: text(),
	confirmationNumber: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_liability_payment_liability_id").on(table.liabilityId),
	index("idx_liability_payment_date").on(table.paymentDate.desc()),
	foreignKey({
		columns: [table.liabilityId],
		foreignColumns: [liability.id],
		name: "LiabilityPayment_liabilityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// HEMS Requests
// ============================================

export const hemsRequest = pgTable("HemsRequest", {
	id: text().primaryKey().notNull(),
	beneficiaryId: text().notNull(),
	entityId: text().notNull(),

	// Request details
	category: text().notNull(), // Converted from enum - 'HEALTH', 'EDUCATION', 'MAINTENANCE', 'SUPPORT', etc.
	amountRequested: numeric({ precision: 14, scale: 2 }).notNull(),
	justification: text().notNull(),
	supportingDocPath: text(),

	// Workflow status
	status: hemsRequestStatus().default('PENDING').notNull(),

	// Review details
	reviewedBy: text(),
	reviewedAt: timestamp({ precision: 3, mode: 'string' }),
	reviewNotes: text(),
	approvedAmount: numeric({ precision: 14, scale: 2 }),

	// Link to distribution when fulfilled
	distributionId: text(),

	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("idx_hems_request_beneficiary_id").on(table.beneficiaryId),
	index("idx_hems_request_entity_id").on(table.entityId),
	index("idx_hems_request_status").on(table.status),
	index("idx_hems_request_distribution_id").on(table.distributionId),
	foreignKey({
		columns: [table.beneficiaryId],
		foreignColumns: [beneficiary.id],
		name: "HemsRequest_beneficiaryId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "HemsRequest_entityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.distributionId],
		foreignColumns: [distribution.id],
		name: "HemsRequest_distributionId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Trustee Fee Schedule
// ============================================

export const trusteeFeeSchedule = pgTable("TrusteeFeeSchedule", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	trusteeId: text().notNull(),

	// Fee rates
	executorFeePercent: numeric({ precision: 5, scale: 2 }).default('5.0'),
	annualAssetPercent: numeric({ precision: 5, scale: 2 }).default('1.5'),
	incomePercent: numeric({ precision: 5, scale: 2 }).default('8.0'),
	hourlyRate: numeric({ precision: 10, scale: 2 }).default('125.00'),

	effectiveDate: timestamp({ precision: 3, mode: 'string' }).notNull(),
	endDate: timestamp({ precision: 3, mode: 'string' }),
	notes: text(),

	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "TrusteeFeeSchedule_entityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.trusteeId],
		foreignColumns: [trustee.id],
		name: "TrusteeFeeSchedule_trusteeId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================
// Trustee Fee Entries
// ============================================

export const trusteeFeeEntry = pgTable("TrusteeFeeEntry", {
	id: text().primaryKey().notNull(),
	entityId: text().notNull(),
	trusteeId: text().notNull(),
	scheduleId: text(),

	// Period
	periodStart: timestamp({ precision: 3, mode: 'string' }).notNull(),
	periodEnd: timestamp({ precision: 3, mode: 'string' }).notNull(),

	// Calculated fees
	assetFee: numeric({ precision: 14, scale: 2 }).default('0'),
	assetBasis: numeric({ precision: 14, scale: 2 }), // Trust value used for calc

	incomeFee: numeric({ precision: 14, scale: 2 }).default('0'),
	incomeBasis: numeric({ precision: 14, scale: 2 }), // Gross income for period

	hoursWorked: numeric({ precision: 6, scale: 2 }).default('0'),
	hourlyFee: numeric({ precision: 14, scale: 2 }).default('0'),

	executorFee: numeric({ precision: 14, scale: 2 }).default('0'), // One-time probate

	totalFee: numeric({ precision: 14, scale: 2 }).notNull(),

	// Payment tracking
	status: trusteeFeeStatus().default('ACCRUED').notNull(),
	paidDate: timestamp({ precision: 3, mode: 'string' }),
	paymentMethod: paymentMethod(),
	checkNumber: text(),

	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.entityId],
		foreignColumns: [entity.id],
		name: "TrusteeFeeEntry_entityId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.trusteeId],
		foreignColumns: [trustee.id],
		name: "TrusteeFeeEntry_trusteeId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.scheduleId],
		foreignColumns: [trusteeFeeSchedule.id],
		name: "TrusteeFeeEntry_scheduleId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================
// Better Auth Tables
// ============================================

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	// Custom fields
	role: userRole().notNull().default('beneficiary'),
	beneficiaryId: text("beneficiary_id"),
}, (table) => [
	foreignKey({
		columns: [table.beneficiaryId],
		foreignColumns: [beneficiary.id],
		name: "user_beneficiaryId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text().notNull().unique(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	index("idx_session_user_id").on(table.userId),
	index("idx_session_token").on(table.token),
	index("idx_session_expires_at").on(table.expiresAt),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [user.id],
		name: "session_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [user.id],
		name: "account_userId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// Type Exports
// ============================================

// Database schema inferred types (from tables)
export type Entity = typeof entity.$inferSelect;
export type Beneficiary = typeof beneficiary.$inferSelect;
export type Distribution = typeof distribution.$inferSelect;
export type Vehicle = typeof vehicle.$inferSelect;
export type Homestead = typeof homestead.$inferSelect;
export type RentalProperty = typeof rentalProperty.$inferSelect;
export type BankAccount = typeof bankAccount.$inferSelect;
export type InvestmentAccount = typeof investmentAccount.$inferSelect;
export type InsurancePolicy = typeof insurancePolicy.$inferSelect;
export type PersonalProperty = typeof personalProperty.$inferSelect;
export type Artwork = typeof artwork.$inferSelect;
export type Valuation = typeof valuation.$inferSelect;
export type Document = typeof document.$inferSelect;
export type Transaction = typeof transaction.$inferSelect;
export type Contact = typeof contact.$inferSelect;
export type ContactAssociation = typeof contactAssociation.$inferSelect;
export type Task = typeof task.$inferSelect;
export type Trustee = typeof trustee.$inferSelect;
export type SpecificBequest = typeof specificBequest.$inferSelect;
export type TrustAccounting = typeof trustAccounting.$inferSelect;
export type WithdrawalRecord = typeof withdrawalRecord.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
export type Liability = typeof liability.$inferSelect;
export type LiabilityPayment = typeof liabilityPayment.$inferSelect;
export type HemsRequest = typeof hemsRequest.$inferSelect;
export type TrusteeFeeSchedule = typeof trusteeFeeSchedule.$inferSelect;
export type TrusteeFeeEntry = typeof trusteeFeeEntry.$inferSelect;
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;

// Enum types
export type PaymentMethodType = "CHECK" | "ACH" | "WIRE" | "CASH" | "OTHER";
export type LiabilityTypeEnum = "MORTGAGE" | "LOAN" | "CREDIT_CARD" | "TAX_OWED" | "ACCOUNTS_PAYABLE" | "LEGAL_JUDGMENT" | "OTHER";
export type RecordStatusEnum = "ACTIVE" | "INACTIVE" | "OPEN" | "PENDING" | "CLOSED" | "FROZEN" | "SOLD" | "TRANSFERRED" | "DISPOSED" | "PAID_OFF" | "DISPUTED" | "WRITTEN_OFF" | "LAPSED" | "CANCELLED" | "CLAIMED" | "DISSOLVED";
export type TitleStatusEnum = "CLEAR" | "LIEN" | "PENDING_TRANSFER";
export type TransferStatusEnum = "PENDING" | "STARTED" | "COMPLETE";
export type EntityTypeEnum = "TRUST" | "LLC" | "CORPORATION" | "PARTNERSHIP" | "INDIVIDUAL";
export type TrustTypeEnum = "REVOCABLE" | "IRREVOCABLE";
export type RelationshipTypeEnum = "CHILD" | "STEPCHILD" | "GRANDCHILD" | "OTHER";
export type DistributionStandardEnum = "HEMS" | "HEMS_PLUS_WITHDRAWAL" | "BROADER" | "WITHDRAWAL_ONLY";
export type TrusteeStatusEnum = "CURRENT" | "SUCCESSOR" | "ARBITOR" | "RESIGNED" | "REMOVED" | "DECEASED";
export type TrusteeFeeStatusEnum = "ACCRUED" | "APPROVED" | "PAID";
export type WithdrawalStatusEnum = "ELIGIBLE" | "PARTIAL" | "COMPLETE" | "NOT_YET_ELIGIBLE";
export type AllocationClassEnum = "PRINCIPAL" | "INCOME";
export type TransactionTypeEnum = "INCOME" | "EXPENSE" | "TRANSFER" | "CAPITAL_IMPROVEMENT" | "DEPRECIATION";
export type DistributionTypeEnum = "INCOME" | "PRINCIPAL" | "CAPITAL_GAIN" | "EXPENSE_REIMBURSEMENT" | "OTHER";
export type InsurancePolicyTypeEnum = "LIFE" | "PROPERTY" | "AUTO" | "UMBRELLA" | "LIABILITY" | "HEALTH" | "OTHER";
export type PremiumFrequencyEnum = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";
export type PropertyTypeEnum = "SINGLE_FAMILY" | "MULTI_FAMILY" | "CONDO" | "TOWNHOUSE" | "LAND" | "COMMERCIAL" | "MOBILE_HOME";
export type RentalStatusEnum = "RENTED" | "VACANT" | "UNDER_RENOVATION" | "LISTED";
export type ValuationTypeEnum = "APPRAISAL" | "MARKET_ESTIMATE" | "TAX_ASSESSED" | "STATEMENT_BALANCE" | "PURCHASE_PRICE" | "BOOK_VALUE" | "SELF_ASSESSED" | "STATEMENT";
export type LogActionEnum = "INSERT" | "UPDATE" | "DELETE" | "SIGN_IN" | "SIGN_OUT" | "FAILED_AUTH" | "ACCESS_DENIED";
export type UserRoleEnum = "admin" | "beneficiary";
export type HemsRequestStatusEnum = "PENDING" | "APPROVED" | "DENIED" | "DISTRIBUTED" | "CANCELLED";

// Commonly used combined types
export type TrustAccountingEntryType = "INCOME" | "EXPENSE";

// =============================================================================
// ENUM TYPE GUARDS
// Runtime validation for enum values from user input
// =============================================================================

/**
 * Type guard for PaymentMethod enum
 * @example isPaymentMethod(formData.paymentMethod) ? formData.paymentMethod : null
 */
export function isPaymentMethod(value: unknown): value is PaymentMethodType {
  const valid: PaymentMethodType[] = ['CHECK', 'ACH', 'WIRE', 'CASH', 'OTHER'];
  return typeof value === 'string' && valid.includes(value as PaymentMethodType);
}

/**
 * Type guard for LiabilityType enum
 */
export function isLiabilityType(value: unknown): value is LiabilityTypeEnum {
  const valid: LiabilityTypeEnum[] = [
    'MORTGAGE', 'LOAN', 'CREDIT_CARD', 'TAX_OWED',
    'ACCOUNTS_PAYABLE', 'LEGAL_JUDGMENT', 'OTHER'
  ];
  return typeof value === 'string' && valid.includes(value as LiabilityTypeEnum);
}

/**
 * Type guard for RecordStatus enum
 */
export function isRecordStatus(value: unknown): value is RecordStatusEnum {
  const valid: RecordStatusEnum[] = [
    'ACTIVE', 'INACTIVE', 'OPEN', 'PENDING', 'CLOSED', 'FROZEN',
    'SOLD', 'TRANSFERRED', 'DISPOSED', 'PAID_OFF', 'DISPUTED',
    'WRITTEN_OFF', 'LAPSED', 'CANCELLED', 'CLAIMED', 'DISSOLVED'
  ];
  return typeof value === 'string' && valid.includes(value as RecordStatusEnum);
}

/**
 * Type guard for DistributionType enum
 */
export function isDistributionType(value: unknown): value is DistributionTypeEnum {
  const valid: DistributionTypeEnum[] = [
    'INCOME', 'PRINCIPAL', 'CAPITAL_GAIN', 'EXPENSE_REIMBURSEMENT', 'OTHER'
  ];
  return typeof value === 'string' && valid.includes(value as DistributionTypeEnum);
}

/**
 * Type guard for AllocationClass enum (Principal vs Income)
 */
export function isAllocationClass(value: unknown): value is AllocationClassEnum {
  const valid: AllocationClassEnum[] = ['PRINCIPAL', 'INCOME'];
  return typeof value === 'string' && valid.includes(value as AllocationClassEnum);
}

/**
 * Type guard for UserRole enum
 */
export function isUserRole(value: unknown): value is UserRoleEnum {
  const valid: UserRoleEnum[] = ['admin', 'beneficiary'];
  return typeof value === 'string' && valid.includes(value as UserRoleEnum);
}

/**
 * Type guard for HemsRequestStatus enum
 */
export function isHemsRequestStatus(value: unknown): value is HemsRequestStatusEnum {
  const valid: HemsRequestStatusEnum[] = [
    'PENDING', 'APPROVED', 'DENIED', 'DISTRIBUTED', 'CANCELLED'
  ];
  return typeof value === 'string' && valid.includes(value as HemsRequestStatusEnum);
}
