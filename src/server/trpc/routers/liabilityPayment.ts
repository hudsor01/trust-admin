import { liabilityPaymentCrud } from '../../../../db/queries'
import {
    insertLiabilityPaymentSchema,
    updateLiabilityPaymentSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const liabilityPaymentRouter = createCrudRouter({
    crud: liabilityPaymentCrud,
    insertSchema: insertLiabilityPaymentSchema,
    updateSchema: updateLiabilityPaymentSchema,
    listFilterKey: 'liabilityId',
})
