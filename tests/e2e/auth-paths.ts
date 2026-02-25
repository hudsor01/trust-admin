import path from 'node:path'

export const ADMIN_AUTH_FILE = path.join(
    process.cwd(),
    'playwright/.auth/admin.json',
)
export const BENEFICIARY_AUTH_FILE = path.join(
    process.cwd(),
    'playwright/.auth/beneficiary.json',
)
