import { relations } from 'drizzle-orm/relations'
import {
    account,
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
    liability,
    liabilityPayment,
    pendingInventoryItem,
    personalProperty,
    rentalProperty,
    session,
    specificBequest,
    transaction,
    trustAccounting,
    trustee,
    trusteeFeeEntry,
    trusteeFeeSchedule,
    user,
    userProfile,
    valuation,
    vehicle,
    withdrawalRecord,
} from './schema'

export const artworkRelations = relations(artwork, ({ one, many }) => ({
    entity: one(entity, {
        fields: [artwork.entityId],
        references: [entity.id],
    }),
    valuations: many(valuation),
}))

export const entityRelations = relations(entity, ({ one, many }) => ({
    artworks: many(artwork),
    pendingInventoryItems: many(pendingInventoryItem),
    entity: one(entity, {
        fields: [entity.parentEntityId],
        references: [entity.id],
        relationName: 'entity_parentEntityId_entity_id',
    }),
    entities: many(entity, {
        relationName: 'entity_parentEntityId_entity_id',
    }),
    homesteads: many(homestead),
    rentalProperties: many(rentalProperty),
    specificBequests: many(specificBequest),
    insurancePolicies: many(insurancePolicy),
    trustees: many(trustee),
    contactAssociations: many(contactAssociation),
    personalProperties: many(personalProperty),
    trusteeFeeEntries: many(trusteeFeeEntry),
    trusteeFeeSchedules: many(trusteeFeeSchedule),
    trustAccountings: many(trustAccounting),
    vehicles: many(vehicle),
    withdrawalRecords: many(withdrawalRecord),
    documents: many(document),
    distributions: many(distribution),
    hemsRequests: many(hemsRequest),
    bankAccounts: many(bankAccount),
    beneficiaries: many(beneficiary),
    investmentAccounts: many(investmentAccount),
    liabilities: many(liability),
}))

export const pendingInventoryItemRelations = relations(
    pendingInventoryItem,
    ({ one }) => ({
        entity: one(entity, {
            fields: [pendingInventoryItem.entityId],
            references: [entity.id],
        }),
    }),
)

export const homesteadRelations = relations(homestead, ({ one, many }) => ({
    entity: one(entity, {
        fields: [homestead.entityId],
        references: [entity.id],
    }),
    documents: many(document),
    liabilities: many(liability),
    transactions: many(transaction),
    valuations: many(valuation),
}))

export const rentalPropertyRelations = relations(
    rentalProperty,
    ({ one, many }) => ({
        entity: one(entity, {
            fields: [rentalProperty.entityId],
            references: [entity.id],
        }),
        documents: many(document),
        liabilities: many(liability),
        transactions: many(transaction),
        valuations: many(valuation),
    }),
)

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

export const beneficiaryRelations = relations(beneficiary, ({ one, many }) => ({
    specificBequests: many(specificBequest),
    withdrawalRecords: many(withdrawalRecord),
    userProfiles: many(userProfile),
    distributions: many(distribution),
    hemsRequests: many(hemsRequest),
    entity: one(entity, {
        fields: [beneficiary.entityId],
        references: [entity.id],
    }),
    beneficiary: one(beneficiary, {
        fields: [beneficiary.parentId],
        references: [beneficiary.id],
        relationName: 'beneficiary_parentId_beneficiary_id',
    }),
    beneficiaries: many(beneficiary, {
        relationName: 'beneficiary_parentId_beneficiary_id',
    }),
    users: many(user),
}))

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}))

export const userRelations = relations(user, ({ one, many }) => ({
    accounts: many(account),
    beneficiary: one(beneficiary, {
        fields: [user.beneficiaryId],
        references: [beneficiary.id],
    }),
    sessions: many(session),
}))

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

export const trusteeRelations = relations(trustee, ({ one, many }) => ({
    entity: one(entity, {
        fields: [trustee.entityId],
        references: [entity.id],
    }),
    contact: one(contact, {
        fields: [trustee.contactId],
        references: [contact.id],
    }),
    trustee: one(trustee, {
        fields: [trustee.coTrusteeId],
        references: [trustee.id],
        relationName: 'trustee_coTrusteeId_trustee_id',
    }),
    trustees: many(trustee, {
        relationName: 'trustee_coTrusteeId_trustee_id',
    }),
    trusteeFeeEntries: many(trusteeFeeEntry),
    trusteeFeeSchedules: many(trusteeFeeSchedule),
}))

export const contactRelations = relations(contact, ({ many }) => ({
    trustees: many(trustee),
    contactAssociations: many(contactAssociation),
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

export const liabilityPaymentRelations = relations(
    liabilityPayment,
    ({ one }) => ({
        liability: one(liability, {
            fields: [liabilityPayment.liabilityId],
            references: [liability.id],
        }),
    }),
)

export const liabilityRelations = relations(liability, ({ one, many }) => ({
    liabilityPayments: many(liabilityPayment),
    entity: one(entity, {
        fields: [liability.entityId],
        references: [entity.id],
    }),
    rentalProperty: one(rentalProperty, {
        fields: [liability.rentalPropertyId],
        references: [rentalProperty.id],
    }),
    homestead: one(homestead, {
        fields: [liability.homesteadId],
        references: [homestead.id],
    }),
    vehicle: one(vehicle, {
        fields: [liability.vehicleId],
        references: [vehicle.id],
    }),
}))

export const personalPropertyRelations = relations(
    personalProperty,
    ({ one, many }) => ({
        entity: one(entity, {
            fields: [personalProperty.entityId],
            references: [entity.id],
        }),
        documents: many(document),
        valuations: many(valuation),
    }),
)

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
        trusteeFeeSchedule: one(trusteeFeeSchedule, {
            fields: [trusteeFeeEntry.scheduleId],
            references: [trusteeFeeSchedule.id],
        }),
    }),
)

export const trusteeFeeScheduleRelations = relations(
    trusteeFeeSchedule,
    ({ one, many }) => ({
        trusteeFeeEntries: many(trusteeFeeEntry),
        entity: one(entity, {
            fields: [trusteeFeeSchedule.entityId],
            references: [entity.id],
        }),
        trustee: one(trustee, {
            fields: [trusteeFeeSchedule.trusteeId],
            references: [trustee.id],
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
        bankAccount: one(bankAccount, {
            fields: [trustAccounting.bankAccountId],
            references: [bankAccount.id],
        }),
    }),
)

export const bankAccountRelations = relations(bankAccount, ({ one, many }) => ({
    trustAccountings: many(trustAccounting),
    documents: many(document),
    entity: one(entity, {
        fields: [bankAccount.entityId],
        references: [entity.id],
    }),
    transactions: many(transaction),
    valuations: many(valuation),
}))

export const vehicleRelations = relations(vehicle, ({ one, many }) => ({
    entity: one(entity, {
        fields: [vehicle.entityId],
        references: [entity.id],
    }),
    documents: many(document),
    liabilities: many(liability),
    transactions: many(transaction),
    valuations: many(valuation),
}))

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

export const distributionRelations = relations(
    distribution,
    ({ one, many }) => ({
        withdrawalRecords: many(withdrawalRecord),
        beneficiary: one(beneficiary, {
            fields: [distribution.beneficiaryId],
            references: [beneficiary.id],
        }),
        entity: one(entity, {
            fields: [distribution.entityId],
            references: [entity.id],
        }),
        hemsRequests: many(hemsRequest),
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

export const investmentAccountRelations = relations(
    investmentAccount,
    ({ one, many }) => ({
        documents: many(document),
        entity: one(entity, {
            fields: [investmentAccount.entityId],
            references: [entity.id],
        }),
        transactions: many(transaction),
        valuations: many(valuation),
    }),
)

export const userProfileRelations = relations(userProfile, ({ one }) => ({
    beneficiary: one(beneficiary, {
        fields: [userProfile.beneficiaryId],
        references: [beneficiary.id],
    }),
}))

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

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}))
