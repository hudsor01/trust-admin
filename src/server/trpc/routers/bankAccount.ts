import { bankAccountCrud, getBankAccountById } from '../../../../db/queries'
import {
    insertBankAccountSchema,
    updateBankAccountSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const bankAccountRouter = createCrudRouter({
    crud: bankAccountCrud,
    insertSchema: insertBankAccountSchema,
    updateSchema: updateBankAccountSchema,
    getById: getBankAccountById,
})
