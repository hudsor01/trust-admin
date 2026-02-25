import { test as base } from '@playwright/test'
import { ADMIN_AUTH_FILE } from './setup/admin.setup'
import { BENEFICIARY_AUTH_FILE } from './setup/beneficiary.setup'

export const adminTest = base.extend<object>({
    storageState: ADMIN_AUTH_FILE,
})

export const beneficiaryTest = base.extend<object>({
    storageState: BENEFICIARY_AUTH_FILE,
})

export { expect } from '@playwright/test'
