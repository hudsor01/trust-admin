/**
 * 3-step wizard configurations for the 7 asset-creation dialogs (plan 23-05).
 *
 * Each config splits a resource's form into three guided sections:
 *   1. Type + Name       — identity (name + the resource's primary type field)
 *   2. Valuation         — DOD valuation, or coverage/premium for insurance
 *   3. Ownership + Linkage — status, transfer status, linkage, notes
 *
 * The `schema` on each step gates the wizard's Next button: only the fields
 * required to *create* the record are validated, so a user cannot advance
 * past an incomplete step. Optional fields (notes, dates) are intentionally
 * absent from the schemas. The final-step submit still routes through the
 * existing `*.create` tRPC procedure, which re-validates the full payload —
 * the wizard adds no new payload shape (see plan threat model T-23-PR-E-01).
 *
 * Per-resource grouping deviations from the spec default are documented in
 * the plan SUMMARY: insurance has no DOD fields, so its Valuation step uses
 * coverage/premium instead; resources with rich identity field sets (vehicle,
 * properties) keep those fields in step 1 alongside name.
 */
import { z } from 'zod'
import type {
    HomesteadFormData,
    RentalFormData,
} from '@/app/(admin)/properties/_components/constants'
import type { WizardStep } from '@/hooks/use-resource-form'
import type {
    bankAccountFormDefaults,
    insurancePolicyFormDefaults,
    investmentAccountFormDefaults,
    personalPropertyFormDefaults,
    vehicleFormDefaults,
} from '@/lib/form-factory'

type VehicleForm = ReturnType<typeof vehicleFormDefaults>
type BankForm = ReturnType<typeof bankAccountFormDefaults>
type InvestmentForm = ReturnType<typeof investmentAccountFormDefaults>
type PersonalPropertyForm = ReturnType<typeof personalPropertyFormDefaults>
type InsuranceForm = ReturnType<typeof insurancePolicyFormDefaults>

const nonEmpty = z.string().min(1)

/** Vehicle: Identity+VehicleInfo / DOD Valuation+Acquisition / Status. */
export const VEHICLE_WIZARD_STEPS: WizardStep<VehicleForm>[] = [
    {
        id: 'type-name',
        label: 'Type + Name',
        fields: [
            'name',
            'description',
            'year',
            'make',
            'model',
            'vin',
            'color',
            'licensePlate',
            'mileage',
            'titleStatus',
        ],
        schema: z.object({
            name: nonEmpty,
            make: nonEmpty,
            model: nonEmpty,
            vin: nonEmpty,
            titleStatus: nonEmpty,
        }),
    },
    {
        id: 'valuation',
        label: 'Valuation',
        fields: [
            'acquisitionDate',
            'acquisitionCost',
            'dodValue',
            'dodValueDate',
            'dodValueType',
        ],
    },
    {
        id: 'ownership',
        label: 'Ownership',
        fields: ['status', 'transferStatus', 'notes'],
        schema: z.object({
            status: nonEmpty,
            transferStatus: nonEmpty,
        }),
    },
]

/** Bank account: Identity+AccountInfo / DOD Valuation / Status. */
export const BANK_ACCOUNT_WIZARD_STEPS: WizardStep<BankForm>[] = [
    {
        id: 'type-name',
        label: 'Type + Name',
        fields: [
            'name',
            'description',
            'institution',
            'accountType',
            'accountName',
            'accountNumber',
            'routingNumber',
        ],
        schema: z.object({
            name: nonEmpty,
            institution: nonEmpty,
            accountType: nonEmpty,
            accountNumber: nonEmpty,
        }),
    },
    {
        id: 'valuation',
        label: 'Valuation',
        fields: ['dodValue', 'dodValueDate'],
    },
    {
        id: 'ownership',
        label: 'Ownership',
        fields: ['status', 'transferStatus', 'notes'],
        schema: z.object({
            status: nonEmpty,
            transferStatus: nonEmpty,
        }),
    },
]

/** Investment account: Identity+AccountInfo / DOD Valuation+CostBasis / Status. */
export const INVESTMENT_ACCOUNT_WIZARD_STEPS: WizardStep<InvestmentForm>[] = [
    {
        id: 'type-name',
        label: 'Type + Name',
        fields: [
            'name',
            'description',
            'institution',
            'accountType',
            'accountName',
            'accountNumber',
        ],
        schema: z.object({
            name: nonEmpty,
            institution: nonEmpty,
            accountType: nonEmpty,
            accountNumber: nonEmpty,
        }),
    },
    {
        id: 'valuation',
        label: 'Valuation',
        fields: ['dodValue', 'dodValueDate', 'costBasis'],
    },
    {
        id: 'ownership',
        label: 'Ownership',
        fields: ['status', 'transferStatus', 'notes'],
        schema: z.object({
            status: nonEmpty,
            transferStatus: nonEmpty,
        }),
    },
]

/**
 * Homestead: Identity+Address / DOD Valuation / Status.
 *
 * Uses HomesteadFormData from the properties page constants (the homestead
 * form has no propertyType/yearBuilt/squareFeet fields — those live only on
 * the form-factory shape, not the page's actual form).
 */
export const HOMESTEAD_WIZARD_STEPS: WizardStep<HomesteadFormData>[] = [
    {
        id: 'type-name',
        label: 'Type + Name',
        fields: [
            'name',
            'description',
            'streetAddress',
            'city',
            'state',
            'zip',
            'county',
        ],
        schema: z.object({
            name: nonEmpty,
        }),
    },
    {
        id: 'valuation',
        label: 'Valuation',
        fields: ['dodValue', 'dodValueDate', 'dodValueType'],
    },
    {
        id: 'ownership',
        label: 'Ownership',
        fields: ['status', 'transferStatus', 'notes'],
        schema: z.object({
            status: nonEmpty,
            transferStatus: nonEmpty,
        }),
    },
]

/** Rental property: Identity+Address+RentalInfo / DOD Valuation / Status. */
export const RENTAL_PROPERTY_WIZARD_STEPS: WizardStep<RentalFormData>[] = [
    {
        id: 'type-name',
        label: 'Type + Name',
        fields: [
            'name',
            'description',
            'streetAddress',
            'city',
            'state',
            'zip',
            'county',
            'rentalStatus',
            'monthlyRent',
            'leaseStart',
            'leaseEnd',
            'propertyManager',
        ],
        schema: z.object({
            name: nonEmpty,
        }),
    },
    {
        id: 'valuation',
        label: 'Valuation',
        fields: ['dodValue', 'dodValueDate', 'dodValueType'],
    },
    {
        id: 'ownership',
        label: 'Ownership',
        fields: ['status', 'transferStatus', 'notes'],
        schema: z.object({
            status: nonEmpty,
            transferStatus: nonEmpty,
        }),
    },
]

/** Personal property: Identity+Category / DOD Valuation+Acquisition / Status. */
export const PERSONAL_PROPERTY_WIZARD_STEPS: WizardStep<PersonalPropertyForm>[] =
    [
        {
            id: 'type-name',
            label: 'Type + Name',
            fields: ['name', 'description', 'category', 'location'],
            schema: z.object({
                name: nonEmpty,
                category: nonEmpty,
            }),
        },
        {
            id: 'valuation',
            label: 'Valuation',
            fields: [
                'acquisitionDate',
                'acquisitionCost',
                'dodValue',
                'dodValueDate',
                'dodValueType',
            ],
        },
        {
            id: 'ownership',
            label: 'Ownership',
            fields: ['status', 'transferStatus', 'notes'],
            schema: z.object({
                status: nonEmpty,
                transferStatus: nonEmpty,
            }),
        },
    ]

/**
 * Insurance policy: Identity+PolicyInfo / Coverage+Premium / Dates+Linkage+Status.
 *
 * DEVIATION: insurancePolicy has no DOD fields (CLAUDE.md — it carries
 * coverageAmount/premium/effectiveDate/expirationDate instead). Step 2
 * "Valuation" therefore collects coverage + premium; the dates and the
 * insured-asset/beneficiaries linkage move into step 3.
 */
export const INSURANCE_WIZARD_STEPS: WizardStep<InsuranceForm>[] = [
    {
        id: 'type-name',
        label: 'Type + Name',
        fields: [
            'name',
            'description',
            'policyType',
            'carrier',
            'policyNumber',
        ],
        schema: z.object({
            name: nonEmpty,
            policyType: nonEmpty,
            carrier: nonEmpty,
            policyNumber: nonEmpty,
        }),
    },
    {
        id: 'valuation',
        label: 'Coverage',
        fields: ['coverageAmount', 'premium', 'premiumFrequency'],
    },
    {
        id: 'ownership',
        label: 'Ownership',
        fields: [
            'effectiveDate',
            'expirationDate',
            'insuredAsset',
            'beneficiaries',
            'status',
            'notes',
        ],
        schema: z.object({
            status: nonEmpty,
        }),
    },
]
