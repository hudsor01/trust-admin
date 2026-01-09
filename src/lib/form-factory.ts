/**
 * Form Factory
 *
 * Creates reusable form utilities:
 * - Default value generators
 * - Form reset functions
 * - Entity-to-form mappers
 */

/**
 * Creates a function that returns fresh default values for a form
 *
 * @example
 * const vehicleDefaults = createFormDefaults({
 *   make: "",
 *   model: "",
 *   year: () => new Date().getFullYear(), // Dynamic default
 * });
 *
 * // Usage
 * const [form, setForm] = useState(vehicleDefaults());
 * const handleReset = () => setForm(vehicleDefaults());
 */
export function createFormDefaults<T extends Record<string, unknown>>(
  defaults: { [K in keyof T]: T[K] | (() => T[K]) }
): () => T {
  return () => {
    const result = {} as T;
    for (const key in defaults) {
      const value = defaults[key];
      // Type assertion needed here because we're dynamically determining if value is a function
      // The generic type system can't track this at compile time, but we know it's safe
      result[key] = (typeof value === "function" ? (value as () => T[typeof key])() : value) as T[typeof key];
    }
    return result;
  };
}

/**
 * Creates a function that maps an entity to form values
 *
 * @example
 * const vehicleToForm = createEntityMapper<Vehicle, VehicleFormData>({
 *   year: (v) => v.year,
 *   make: (v) => v.make,
 *   acquisitionDate: (v) => v.acquisitionDate?.split("T")[0] ?? null,
 * });
 *
 * // Usage
 * const handleEdit = (vehicle: Vehicle) => {
 *   setForm(vehicleToForm(vehicle));
 * };
 */
export function createEntityMapper<E, F extends Record<string, unknown>>(
  mappers: { [K in keyof F]: (entity: E) => F[K] }
): (entity: E) => F {
  return (entity: E) => {
    const result = {} as F;
    for (const key in mappers) {
      result[key] = mappers[key](entity);
    }
    return result;
  };
}

/**
 * Utility to parse date strings for form inputs
 * Handles ISO dates by extracting just the date portion
 */
export function toDateInput(date: string | null | undefined): string | null {
  if (!date) return null;
  return date.split("T")[0] ?? null;
}

/**
 * Utility to parse number strings, returning null for empty
 */
export function toNumberOrNull(value: string | null | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Utility to convert empty strings to null
 */
export function emptyToNull(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value;
}

// =============================================================================
// PRE-BUILT FORM DEFAULTS
// =============================================================================

export const vehicleFormDefaults = createFormDefaults({
  year: () => new Date().getFullYear(),
  make: "",
  model: "",
  vin: "",
  color: "",
  licensePlate: "",
  mileage: null as number | null,
  titleStatus: "CLEAR",
  acquisitionDate: null as string | null,
  acquisitionCost: "",
  dodValue: "",
  dodValueDate: null as string | null,
  dodValueType: "",
  status: "ACTIVE",
  transferStatus: "PENDING",
  notes: "",
});

export const bankAccountFormDefaults = createFormDefaults({
  institution: "",
  accountType: "CHECKING",
  accountName: "",
  accountNumber: "",
  routingNumber: "",
  dodValue: "",
  dodValueDate: null as string | null,
  status: "OPEN",
  transferStatus: "PENDING",
  notes: "",
});

export const investmentAccountFormDefaults = createFormDefaults({
  institution: "",
  accountType: "BROKERAGE",
  accountName: "",
  accountNumber: "",
  dodValue: "",
  dodValueDate: null as string | null,
  costBasis: "",
  status: "OPEN",
  transferStatus: "PENDING",
  notes: "",
});

export const homesteadFormDefaults = createFormDefaults({
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  county: "",
  propertyType: "SINGLE_FAMILY",
  yearBuilt: null as number | null,
  squareFeet: null as number | null,
  bedrooms: null as number | null,
  bathrooms: "",
  acquisitionDate: null as string | null,
  acquisitionCost: "",
  dodValue: "",
  dodValueDate: null as string | null,
  status: "ACTIVE",
  transferStatus: "PENDING",
  notes: "",
});

export const rentalPropertyFormDefaults = createFormDefaults({
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  propertyType: "SINGLE_FAMILY",
  units: null as number | null,
  squareFeet: null as number | null,
  monthlyRent: "",
  rentalStatus: "RENTED",
  acquisitionDate: null as string | null,
  acquisitionCost: "",
  dodValue: "",
  dodValueDate: null as string | null,
  status: "ACTIVE",
  transferStatus: "PENDING",
  notes: "",
});

export const trusteeFormDefaults = createFormDefaults({
  name: "",
  status: "CURRENT",
  order: 1,
  isCo: false,
  coTrusteeId: null as string | null,
  startDate: null as string | null,
  endDate: null as string | null,
});

export const contactFormDefaults = createFormDefaults({
  name: "",
  company: "",
  role: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
});

export const beneficiaryFormDefaults = createFormDefaults({
  firstName: "",
  lastName: "",
  relationship: "",
  relationshipType: "",
  dob: null as string | null,
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  sharePercent: "",
  distributionStandard: "HEMS",
});
