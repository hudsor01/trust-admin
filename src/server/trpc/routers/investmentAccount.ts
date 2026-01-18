import { investmentAccountCrud } from '../../../../db/queries'
import {
    insertInvestmentAccountSchema,
    updateInvestmentAccountSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const investmentAccountRouter = createCrudRouter({
    crud: investmentAccountCrud,
    insertSchema: insertInvestmentAccountSchema,
    updateSchema: updateInvestmentAccountSchema,
})
