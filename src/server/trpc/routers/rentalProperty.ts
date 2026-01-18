import {
    getRentalPropertyById,
    rentalPropertyCrud,
} from '../../../../db/queries'
import {
    insertRentalPropertySchema,
    updateRentalPropertySchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const rentalPropertyRouter = createCrudRouter({
    crud: rentalPropertyCrud,
    insertSchema: insertRentalPropertySchema,
    updateSchema: updateRentalPropertySchema,
    getById: getRentalPropertyById,
})
