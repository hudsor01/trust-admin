/**
 * Entity Query Hooks
 *
 * Pre-configured hooks for all entity types.
 * Each hook provides: data, loading, error, refetch, create, update, remove
 */
import { createQueryHook } from "./use-query";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Entity {
  id: string;
  name: string;
  entityType: string;
  trustType: string | null;
  grantorName: string | null;
  ein: string | null;
  dod: string | null;
  governingLaw: string | null;
  stateOfFormation: string | null;
  formationDate: string | null;
  status: string;
}

export interface Vehicle {
  id: string;
  entityId: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  color: string | null;
  licensePlate: string | null;
  mileage: number | null;
  titleStatus: string;
  acquisitionDate: string | null;
  acquisitionCost: string | null;
  dodValue: string | null;
  dodValueDate: string | null;
  dodValueType: string | null;
  status: string;
  transferStatus: string;
  notes: string | null;
}

export interface Beneficiary {
  id: string;
  entityId: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  relationshipType: string | null;
  dob: string | null;
  email: string | null;
  phone: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  sharePercent: string | null;
  distributionStandard: string | null;
  informed: boolean;
  releaseSigned: boolean;
}

export interface Trustee {
  id: string;
  entityId: string;
  name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  status: string;
  order: number;
  isCo: boolean;
  coTrusteeId: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  role: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
}

export interface Task {
  id: string;
  entityId: string | null;
  title: string;
  category: string;
  completed: boolean;
  dueDate: string | null;
  sortOrder: number;
}

export interface BankAccount {
  id: string;
  entityId: string;
  institution: string;
  accountType: string;
  accountName: string | null;
  accountNumber: string | null;
  routingNumber: string | null;
  dodValue: string | null;
  dodValueDate: string | null;
  status: string;
  transferStatus: string;
  notes: string | null;
}

export interface InvestmentAccount {
  id: string;
  entityId: string;
  institution: string;
  accountType: string;
  accountName: string | null;
  accountNumber: string | null;
  dodValue: string | null;
  dodValueDate: string | null;
  costBasis: string | null;
  status: string;
  transferStatus: string;
  notes: string | null;
}

export interface Homestead {
  id: string;
  entityId: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  parcelNumber: string | null;
  legalDescription: string | null;
  propertyType: string;
  yearBuilt: number | null;
  squareFeet: number | null;
  lotSizeAcres: number | null;
  bedrooms: number | null;
  bathrooms: string | null;
  acquisitionDate: string | null;
  acquisitionCost: string | null;
  dodValue: string | null;
  dodValueDate: string | null;
  dodValueType: string | null;
  dodAffidavitFiled: boolean;
  dodAffidavitDate: string | null;
  clerkFileNo: string | null;
  status: string;
  transferStatus: string;
  notes: string | null;
}

export interface RentalProperty {
  id: string;
  entityId: string;
  name: string | null;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  parcelNumber: string | null;
  propertyType: string;
  units: number | null;
  squareFeet: number | null;
  lotSizeAcres: number | null;
  yearBuilt: number | null;
  monthlyRent: string | null;
  rentalStatus: string;
  leaseStart: string | null;
  leaseEnd: string | null;
  propertyManager: string | null;
  mortgageBalance: string | null;
  acquisitionDate: string | null;
  acquisitionCost: string | null;
  dodValue: string | null;
  dodValueDate: string | null;
  dodValueType: string | null;
  dodAffidavitFiled: boolean;
  dodAffidavitDate: string | null;
  clerkFileNo: string | null;
  status: string;
  transferStatus: string;
  notes: string | null;
}

export interface Artwork {
  id: string;
  entityId: string;
  title: string;
  artist: string | null;
  medium: string | null;
  dimensions: string | null;
  acquisitionDate: string | null;
  acquisitionCost: string | null;
  dodValue: string | null;
  dodValueDate: string | null;
  location: string | null;
  notes: string | null;
}

export interface PersonalProperty {
  id: string;
  entityId: string;
  name: string;
  description: string | null;
  category: string | null;
  location: string | null;
  acquisitionDate: string | null;
  acquisitionCost: string | null;
  dodValue: string | null;
  dodValueDate: string | null;
  notes: string | null;
}

// Texas Property Code 113.152(5) - Liabilities
export interface Liability {
  id: string;
  entityId: string;
  liabilityType: string;
  creditor: string;
  description: string | null;
  originalAmount: string;
  currentBalance: string;
  currentBalanceDate: string | null;
  interestRate: string | null;
  monthlyPayment: string | null;
  dueDate: string | null;
  paymentDueDay: number | null;
  rentalPropertyId: string | null;
  homesteadId: string | null;
  vehicleId: string | null;
  status: string;
  allocationClass: string;
  notes: string | null;
}

export interface LiabilityPayment {
  id: string;
  liabilityId: string;
  paymentDate: string;
  amount: string;
  principalPortion: string | null;
  interestPortion: string | null;
  escrowPortion: string | null;
  paymentMethod: string | null;
  checkNumber: string | null;
  confirmationNumber: string | null;
  notes: string | null;
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

/** Entities - sorted by DOD first, then name */
export const useEntities = createQueryHook<Entity>("/api/entities", {
  sortFn: (data) =>
    data.sort((a, b) => {
      if (a.dod && !b.dod) return -1;
      if (!a.dod && b.dod) return 1;
      return a.name.localeCompare(b.name);
    }),
});

/** Vehicles - filtered by entityId */
export const useVehicles = createQueryHook<Vehicle>("/api/vehicles", {
  filterParam: "entityId",
});

/** Beneficiaries - filtered by entityId */
export const useBeneficiaries = createQueryHook<Beneficiary>("/api/beneficiaries", {
  filterParam: "entityId",
});

/** Trustees - filtered by entityId, sorted by order */
export const useTrustees = createQueryHook<Trustee>("/api/trustees", {
  filterParam: "entityId",
  sortFn: (data) => data.sort((a, b) => a.order - b.order),
});

/** Contacts - sorted by name */
export const useContacts = createQueryHook<Contact>("/api/contacts", {
  sortFn: (data) => data.sort((a, b) => a.name.localeCompare(b.name)),
});

/** Tasks - sorted by sortOrder */
export const useTasks = createQueryHook<Task>("/api/tasks", {
  sortFn: (data) => data.sort((a, b) => a.sortOrder - b.sortOrder),
});

/** Bank Accounts - filtered by entityId */
export const useBankAccounts = createQueryHook<BankAccount>("/api/bank-accounts", {
  filterParam: "entityId",
});

/** Investment Accounts - filtered by entityId */
export const useInvestmentAccounts = createQueryHook<InvestmentAccount>("/api/investment-accounts", {
  filterParam: "entityId",
});

/** Homesteads - filtered by entityId */
export const useHomesteads = createQueryHook<Homestead>("/api/homesteads", {
  filterParam: "entityId",
});

/** Rental Properties - filtered by entityId */
export const useRentalProperties = createQueryHook<RentalProperty>("/api/rental-properties", {
  filterParam: "entityId",
});

/** Artwork - filtered by entityId */
export const useArtwork = createQueryHook<Artwork>("/api/artwork", {
  filterParam: "entityId",
});

/** Personal Property - filtered by entityId */
export const usePersonalProperty = createQueryHook<PersonalProperty>("/api/personal-property", {
  filterParam: "entityId",
});

/** Liabilities - filtered by entityId (Texas 113.152(5)) */
export const useLiabilities = createQueryHook<Liability>("/api/liabilities", {
  filterParam: "entityId",
});

/** Liability Payments - filtered by liabilityId */
export const useLiabilityPayments = createQueryHook<LiabilityPayment>("/api/liability-payments", {
  filterParam: "liabilityId",
});

// Re-export factory for custom hooks
export { createQueryHook } from "./use-query";

// Re-export error handling hook
export { useToastError } from "./use-toast-error";

// Re-export form state management hook
export { useResourceForm } from "./use-resource-form";
