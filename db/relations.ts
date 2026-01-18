import { relations } from 'drizzle-orm/relations'
import {
    artwork,
    bankAccount,
    beneficiary,
    contact,
    contactAssociation,
    distribution,
    document,
    entity,
    hemsRequest,
    homestead,
    insurancePolicy,
    investmentAccount,
    personalProperty,
    rentalProperty,
    specificBequest,
    transaction,
    trustAccounting,
    trustee,
    trusteeFeeEntry,
    trusteeFeeSchedule,
    valuation,
    vehicle,
    withdrawalRecord,
} from './schema'

export const entityRelations = relations(entity, ({ one, many }) => ({
    entity: one(entity, {
        fields: [entity.parentEntityId],
        references: [entity.id],
        relationName: 'entity_parentEntityId_entity_id',
    }),
    entities: many(entity, {
        relationName: 'entity_parentEntityId_entity_id',
    }),
    vehicles: many(vehicle),
    homesteads: many(homestead),
    rentalProperties: many(rentalProperty),
    bankAccounts: many(bankAccount),
    investmentAccounts: many(investmentAccount),
    insurancePolicies: many(insurancePolicy),
    personalProperties: many(personalProperty),
    artworks: many(artwork),
    documents: many(document),
    contactAssociations: many(contactAssociation),
    trustees: many(trustee),
    specificBequests: many(specificBequest),
    beneficiaries: many(beneficiary),
    trustAccountingEntries: many(trustAccounting),
    withdrawalRecords: many(withdrawalRecord),
    distributions: many(distribution),
    hemsRequests: many(hemsRequest),
    trusteeFeeSchedules: many(trusteeFeeSchedule),
    trusteeFeeEntries: many(trusteeFeeEntry),
}))

export const vehicleRelations = relations(vehicle, ({ one, many }) => ({
    entity: one(entity, {
        fields: [vehicle.entityId],
        references: [entity.id],
    }),
    valuations: many(valuation),
    documents: many(document),
    transactions: many(transaction),
}))

export const homesteadRelations = relations(homestead, ({ one, many }) => ({
    entity: one(entity, {
        fields: [homestead.entityId],
        references: [entity.id],
    }),
    valuations: many(valuation),
    documents: many(document),
    transactions: many(transaction),
}))

export const rentalPropertyRelations = relations(
    rentalProperty,
    ({ one, many }) => ({
        entity: one(entity, {
            fields: [rentalProperty.entityId],
            references: [entity.id],
        }),
        valuations: many(valuation),
        documents: many(document),
        transactions: many(transaction),
    }),
)

export const bankAccountRelations = relations(bankAccount, ({ one, many }) => ({
    entity: one(entity, {
        fields: [bankAccount.entityId],
        references: [entity.id],
    }),
    valuations: many(valuation),
    documents: many(document),
    transactions: many(transaction),
}))

export const investmentAccountRelations = relations(
    investmentAccount,
    ({ one, many }) => ({
        entity: one(entity, {
            fields: [investmentAccount.entityId],
            references: [entity.id],
        }),
        valuations: many(valuation),
        documents: many(document),
        transactions: many(transaction),
    }),
)

export const insurancePolicyRelations = relations(
    insurancePolicy,
    ({ one, many }) => ({
        entity: one(entity, {
            fields: [insurancePolicy.entityId],
            references: [entity.id],
        }),
        documents: many(document),
        transactions: many(transaction),
    }),
)

export const distributionRelations = relations(distribution, ({ one }) => ({
    beneficiary: one(beneficiary, {
        fields: [distribution.beneficiaryId],
        references: [beneficiary.id],
    }),
    entity: one(entity, {
        fields: [distribution.entityId],
        references: [entity.id],
    }),
}))

export const beneficiaryRelations = relations(beneficiary, ({ one, many }) => ({
    distributions: many(distribution),
    specificBequests: many(specificBequest),
    withdrawalRecords: many(withdrawalRecord),
    hemsRequests: many(hemsRequest),
    entity: one(entity, {
        fields: [beneficiary.entityId],
        references: [entity.id],
    }),
    parent: one(beneficiary, {
        fields: [beneficiary.parentId],
        references: [beneficiary.id],
        relationName: 'beneficiary_parentId_beneficiary_id',
    }),
    children: many(beneficiary, {
        relationName: 'beneficiary_parentId_beneficiary_id',
    }),
}))

export const valuationRelations = relations(valuation, ({ one }) => ({
    vehicle: one(vehicle, {
        fields: [valuation.vehicleId],
        references: [vehicle.id],
    }),
    homestead: one(homestead, {
        fields: [valuation.homesteadId],
        references: [homestead.id],
    }),
    rentalProperty: one(rentalProperty, {
        fields: [valuation.rentalPropertyId],
        references: [rentalProperty.id],
    }),
    bankAccount: one(bankAccount, {
        fields: [valuation.bankAccountId],
        references: [bankAccount.id],
    }),
    investmentAccount: one(investmentAccount, {
        fields: [valuation.investmentAccountId],
        references: [investmentAccount.id],
    }),
    personalProperty: one(personalProperty, {
        fields: [valuation.personalPropertyId],
        references: [personalProperty.id],
    }),
    artwork: one(artwork, {
        fields: [valuation.artworkId],
        references: [artwork.id],
    }),
}))

export const personalPropertyRelations = relations(
    personalProperty,
    ({ one, many }) => ({
        entity: one(entity, {
            fields: [personalProperty.entityId],
            references: [entity.id],
        }),
        valuations: many(valuation),
        documents: many(document),
    }),
)

export const documentRelations = relations(document, ({ one }) => ({
    entity: one(entity, {
        fields: [document.entityId],
        references: [entity.id],
    }),
    vehicle: one(vehicle, {
        fields: [document.vehicleId],
        references: [vehicle.id],
    }),
    homestead: one(homestead, {
        fields: [document.homesteadId],
        references: [homestead.id],
    }),
    rentalProperty: one(rentalProperty, {
        fields: [document.rentalPropertyId],
        references: [rentalProperty.id],
    }),
    bankAccount: one(bankAccount, {
        fields: [document.bankAccountId],
        references: [bankAccount.id],
    }),
    investmentAccount: one(investmentAccount, {
        fields: [document.investmentAccountId],
        references: [investmentAccount.id],
    }),
    insurancePolicy: one(insurancePolicy, {
        fields: [document.insurancePolicyId],
        references: [insurancePolicy.id],
    }),
    personalProperty: one(personalProperty, {
        fields: [document.personalPropertyId],
        references: [personalProperty.id],
    }),
}))

export const transactionRelations = relations(transaction, ({ one }) => ({
    vehicle: one(vehicle, {
        fields: [transaction.vehicleId],
        references: [vehicle.id],
    }),
    homestead: one(homestead, {
        fields: [transaction.homesteadId],
        references: [homestead.id],
    }),
    rentalProperty: one(rentalProperty, {
        fields: [transaction.rentalPropertyId],
        references: [rentalProperty.id],
    }),
    bankAccount: one(bankAccount, {
        fields: [transaction.bankAccountId],
        references: [bankAccount.id],
    }),
    investmentAccount: one(investmentAccount, {
        fields: [transaction.investmentAccountId],
        references: [investmentAccount.id],
    }),
    insurancePolicy: one(insurancePolicy, {
        fields: [transaction.insurancePolicyId],
        references: [insurancePolicy.id],
    }),
}))

export const contactAssociationRelations = relations(
    contactAssociation,
    ({ one }) => ({
        contact: one(contact, {
            fields: [contactAssociation.contactId],
            references: [contact.id],
        }),
        entity: one(entity, {
            fields: [contactAssociation.entityId],
            references: [entity.id],
        }),
    }),
)

export const contactRelations = relations(contact, ({ many }) => ({
    contactAssociations: many(contactAssociation),
    trustees: many(trustee),
}))

export const artworkRelations = relations(artwork, ({ one, many }) => ({
    entity: one(entity, {
        fields: [artwork.entityId],
        references: [entity.id],
    }),
    valuations: many(valuation),
}))

export const trusteeRelations = relations(trustee, ({ one, many }) => ({
    entity: one(entity, {
        fields: [trustee.entityId],
        references: [entity.id],
    }),
    contact: one(contact, {
        fields: [trustee.contactId],
        references: [contact.id],
    }),
    coTrustee: one(trustee, {
        fields: [trustee.coTrusteeId],
        references: [trustee.id],
        relationName: 'trustee_coTrusteeId_trustee_id',
    }),
    feeSchedules: many(trusteeFeeSchedule),
    feeEntries: many(trusteeFeeEntry),
}))

export const specificBequestRelations = relations(
    specificBequest,
    ({ one }) => ({
        entity: one(entity, {
            fields: [specificBequest.entityId],
            references: [entity.id],
        }),
        beneficiary: one(beneficiary, {
            fields: [specificBequest.beneficiaryId],
            references: [beneficiary.id],
        }),
    }),
)

export const trustAccountingRelations = relations(
    trustAccounting,
    ({ one }) => ({
        entity: one(entity, {
            fields: [trustAccounting.entityId],
            references: [entity.id],
        }),
    }),
)

export const withdrawalRecordRelations = relations(
    withdrawalRecord,
    ({ one }) => ({
        beneficiary: one(beneficiary, {
            fields: [withdrawalRecord.beneficiaryId],
            references: [beneficiary.id],
        }),
        entity: one(entity, {
            fields: [withdrawalRecord.entityId],
            references: [entity.id],
        }),
        distribution: one(distribution, {
            fields: [withdrawalRecord.distributionId],
            references: [distribution.id],
        }),
    }),
)

// HEMS Request Relations
export const hemsRequestRelations = relations(hemsRequest, ({ one }) => ({
    beneficiary: one(beneficiary, {
        fields: [hemsRequest.beneficiaryId],
        references: [beneficiary.id],
    }),
    entity: one(entity, {
        fields: [hemsRequest.entityId],
        references: [entity.id],
    }),
    distribution: one(distribution, {
        fields: [hemsRequest.distributionId],
        references: [distribution.id],
    }),
}))

// Trustee Fee Schedule Relations
export const trusteeFeeScheduleRelations = relations(
    trusteeFeeSchedule,
    ({ one, many }) => ({
        entity: one(entity, {
            fields: [trusteeFeeSchedule.entityId],
            references: [entity.id],
        }),
        trustee: one(trustee, {
            fields: [trusteeFeeSchedule.trusteeId],
            references: [trustee.id],
        }),
        entries: many(trusteeFeeEntry),
    }),
)

// Trustee Fee Entry Relations
export const trusteeFeeEntryRelations = relations(
    trusteeFeeEntry,
    ({ one }) => ({
        entity: one(entity, {
            fields: [trusteeFeeEntry.entityId],
            references: [entity.id],
        }),
        trustee: one(trustee, {
            fields: [trusteeFeeEntry.trusteeId],
            references: [trustee.id],
        }),
        schedule: one(trusteeFeeSchedule, {
            fields: [trusteeFeeEntry.scheduleId],
            references: [trusteeFeeSchedule.id],
        }),
    }),
)
