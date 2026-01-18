import { trusteeFeeScheduleCrud } from '../../../../db/queries'
import {
    insertTrusteeFeeScheduleSchema,
    updateTrusteeFeeScheduleSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const trusteeFeeScheduleRouter = createCrudRouter({
    crud: trusteeFeeScheduleCrud,
    insertSchema: insertTrusteeFeeScheduleSchema,
    updateSchema: updateTrusteeFeeScheduleSchema,
})
