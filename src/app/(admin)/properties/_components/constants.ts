import {
    enumToOptions,
    PROPERTY_TYPE_VALUES,
    RECORD_STATUS_VALUES,
} from '@/lib/type-utils'

// Derived from schema enums (single source of truth)
export const PROPERTY_TYPES = enumToOptions(PROPERTY_TYPE_VALUES)
export const ASSET_STATUS = enumToOptions(RECORD_STATUS_VALUES, (v) =>
    ['ACTIVE', 'SOLD', 'TRANSFERRED', 'DISPOSED'].includes(v),
)
