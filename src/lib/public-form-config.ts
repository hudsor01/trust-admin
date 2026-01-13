export interface FormField {
  name: string
  label: string
  type: "text" | "number" | "select" | "textarea" | "date"
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  description?: string
}

export interface AssetTypeConfig {
  value: string
  label: string
  description: string
  fields: FormField[]
}

export const ASSET_TYPES: AssetTypeConfig[] = [
  {
    value: "vehicle",
    label: "Vehicle",
    description: "Cars, trucks, motorcycles, boats, RVs",
    fields: [
      { name: "year", label: "Year", type: "number", required: true, placeholder: "2020" },
      { name: "make", label: "Make", type: "text", required: true, placeholder: "Toyota" },
      { name: "model", label: "Model", type: "text", required: true, placeholder: "Camry" },
      { name: "vin", label: "VIN", type: "text", placeholder: "17-character VIN (optional)" },
      { name: "color", label: "Color", type: "text", placeholder: "Silver" },
      { name: "mileage", label: "Mileage", type: "number", placeholder: "50000" },
      {
        name: "notes",
        label: "Additional Notes",
        type: "textarea",
        placeholder: "Any additional information...",
      },
    ],
  },
  {
    value: "personal-property",
    label: "Personal Property",
    description: "Furniture, jewelry, electronics, collectibles, tools",
    fields: [
      {
        name: "name",
        label: "Item Name",
        type: "text",
        required: true,
        placeholder: "Sterling Silver Fork",
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: [
          { value: "JEWELRY", label: "Jewelry" },
          { value: "ART", label: "Art" },
          { value: "COLLECTIBLES", label: "Collectibles" },
          { value: "FURNITURE", label: "Furniture" },
          { value: "EQUIPMENT", label: "Equipment" },
          { value: "ELECTRONICS", label: "Electronics" },
          { value: "TOOLS", label: "Tools" },
          { value: "FIREARMS", label: "Firearms" },
          { value: "OTHER", label: "Other" },
        ],
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Detailed description...",
      },
      {
        name: "location",
        label: "Location",
        type: "text",
        placeholder: "Where is this item located?",
      },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  {
    value: "bank-account",
    label: "Bank Account",
    description: "Checking, savings, CDs, money market accounts",
    fields: [
      {
        name: "institution",
        label: "Bank/Institution",
        type: "text",
        required: true,
        placeholder: "Chase Bank",
      },
      {
        name: "accountType",
        label: "Account Type",
        type: "select",
        required: true,
        options: [
          { value: "CHECKING", label: "Checking" },
          { value: "SAVINGS", label: "Savings" },
          { value: "CD", label: "Certificate of Deposit (CD)" },
          { value: "MONEY_MARKET", label: "Money Market" },
          { value: "BUSINESS_CHECKING", label: "Business Checking" },
          { value: "BUSINESS_SAVINGS", label: "Business Savings" },
        ],
      },
      {
        name: "accountNumber",
        label: "Account Number (Last 4 digits)",
        type: "text",
        placeholder: "****1234 (optional)",
      },
      { name: "currentBalance", label: "Current Balance", type: "number", placeholder: "5000.00" },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  {
    value: "investment-account",
    label: "Investment Account",
    description: "Brokerage, IRA, 401(k), annuities",
    fields: [
      {
        name: "institution",
        label: "Institution",
        type: "text",
        required: true,
        placeholder: "Fidelity",
      },
      {
        name: "accountType",
        label: "Account Type",
        type: "select",
        required: true,
        options: [
          { value: "BROKERAGE", label: "Brokerage" },
          { value: "IRA_TRADITIONAL", label: "Traditional IRA" },
          { value: "IRA_ROTH", label: "Roth IRA" },
          { value: "K401", label: "401(k)" },
          { value: "ANNUITY", label: "Annuity" },
          { value: "HSA", label: "Health Savings Account (HSA)" },
          { value: "FIVE29", label: "529 Education Savings" },
          { value: "OTHER", label: "Other" },
        ],
      },
      {
        name: "accountNumber",
        label: "Account Number (Last 4 digits)",
        type: "text",
        placeholder: "****5678 (optional)",
      },
      { name: "currentBalance", label: "Current Balance", type: "number", placeholder: "50000.00" },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  {
    value: "insurance-policy",
    label: "Insurance Policy",
    description: "Life, property, auto, health, umbrella insurance",
    fields: [
      {
        name: "policyType",
        label: "Policy Type",
        type: "select",
        required: true,
        options: [
          { value: "LIFE", label: "Life Insurance" },
          { value: "PROPERTY", label: "Property Insurance" },
          { value: "AUTO", label: "Auto Insurance" },
          { value: "UMBRELLA", label: "Umbrella Insurance" },
          { value: "LIABILITY", label: "Liability Insurance" },
          { value: "HEALTH", label: "Health Insurance" },
          { value: "OTHER", label: "Other" },
        ],
      },
      {
        name: "carrier",
        label: "Insurance Carrier",
        type: "text",
        required: true,
        placeholder: "State Farm",
      },
      {
        name: "policyNumber",
        label: "Policy Number",
        type: "text",
        required: true,
        placeholder: "POL-123456",
      },
      {
        name: "coverageAmount",
        label: "Coverage Amount",
        type: "number",
        placeholder: "500000.00",
      },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  {
    value: "homestead",
    label: "Homestead (Primary Residence)",
    description: "Primary residence property",
    fields: [
      {
        name: "streetAddress",
        label: "Street Address",
        type: "text",
        required: true,
        placeholder: "123 Main St",
      },
      { name: "city", label: "City", type: "text", required: true, placeholder: "Austin" },
      { name: "state", label: "State", type: "text", required: true, placeholder: "TX" },
      { name: "zip", label: "ZIP Code", type: "text", required: true, placeholder: "78701" },
      {
        name: "propertyType",
        label: "Property Type",
        type: "select",
        required: true,
        options: [
          { value: "SINGLE_FAMILY", label: "Single Family" },
          { value: "MULTI_FAMILY", label: "Multi-Family" },
          { value: "CONDO", label: "Condo" },
          { value: "TOWNHOUSE", label: "Townhouse" },
          { value: "MOBILE_HOME", label: "Mobile Home" },
        ],
      },
      { name: "yearBuilt", label: "Year Built", type: "number", placeholder: "1995" },
      { name: "squareFeet", label: "Square Feet", type: "number", placeholder: "2000" },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  {
    value: "rental-property",
    label: "Rental Property",
    description: "Income-producing rental properties",
    fields: [
      {
        name: "name",
        label: "Property Name",
        type: "text",
        required: true,
        placeholder: "Oak Street Rental",
      },
      {
        name: "streetAddress",
        label: "Street Address",
        type: "text",
        required: true,
        placeholder: "456 Oak St",
      },
      { name: "city", label: "City", type: "text", required: true, placeholder: "Houston" },
      { name: "state", label: "State", type: "text", required: true, placeholder: "TX" },
      { name: "zip", label: "ZIP Code", type: "text", required: true, placeholder: "77001" },
      {
        name: "propertyType",
        label: "Property Type",
        type: "select",
        required: true,
        options: [
          { value: "SINGLE_FAMILY", label: "Single Family" },
          { value: "MULTI_FAMILY", label: "Multi-Family" },
          { value: "CONDO", label: "Condo" },
          { value: "TOWNHOUSE", label: "Townhouse" },
          { value: "COMMERCIAL", label: "Commercial" },
        ],
      },
      { name: "monthlyRent", label: "Monthly Rent", type: "number", placeholder: "1500.00" },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  {
    value: "artwork",
    label: "Artwork",
    description: "Art pieces, paintings, sculptures",
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        placeholder: "Sunset Landscape",
      },
      { name: "artist", label: "Artist", type: "text", placeholder: "John Smith" },
      { name: "medium", label: "Medium", type: "text", placeholder: "Oil on canvas" },
      { name: "dimensions", label: "Dimensions", type: "text", placeholder: '24" x 36"' },
      { name: "location", label: "Current Location", type: "text", placeholder: "Living room" },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
  {
    value: "liability",
    label: "Liability/Debt",
    description: "Mortgages, loans, credit cards, taxes owed",
    fields: [
      {
        name: "liabilityType",
        label: "Liability Type",
        type: "select",
        required: true,
        options: [
          { value: "MORTGAGE", label: "Mortgage" },
          { value: "LOAN", label: "Loan" },
          { value: "CREDIT_CARD", label: "Credit Card" },
          { value: "TAX_OWED", label: "Tax Owed" },
          { value: "ACCOUNTS_PAYABLE", label: "Accounts Payable" },
          { value: "LEGAL_JUDGMENT", label: "Legal Judgment" },
          { value: "OTHER", label: "Other" },
        ],
      },
      {
        name: "creditor",
        label: "Creditor/Lender",
        type: "text",
        required: true,
        placeholder: "Bank of America",
      },
      {
        name: "originalAmount",
        label: "Original Amount",
        type: "number",
        required: true,
        placeholder: "250000.00",
      },
      {
        name: "currentBalance",
        label: "Current Balance",
        type: "number",
        placeholder: "185000.00 (optional)",
      },
      { name: "interestRate", label: "Interest Rate (%)", type: "number", placeholder: "4.5" },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
  },
]
