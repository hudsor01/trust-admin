import { test as base } from '@playwright/test'
import { ADMIN_AUTH_FILE, BENEFICIARY_AUTH_FILE } from './auth-paths'

export const adminTest = base.extend<object>({
    storageState: ADMIN_AUTH_FILE,
})

export const beneficiaryTest = base.extend<object>({
    storageState: BENEFICIARY_AUTH_FILE,
})

export { expect } from '@playwright/test'
