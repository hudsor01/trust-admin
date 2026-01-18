import { trusteeCrud } from '../../../../db/queries'
import {
    insertTrusteeSchema,
    updateTrusteeSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const trusteeRouter = createCrudRouter({
    crud: trusteeCrud,
    insertSchema: insertTrusteeSchema,
    updateSchema: updateTrusteeSchema,
})
