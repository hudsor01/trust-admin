import { personalPropertyCrud } from '../../../../db/queries'
import {
    insertPersonalPropertySchema,
    updatePersonalPropertySchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const personalPropertyRouter = createCrudRouter({
    crud: personalPropertyCrud,
    insertSchema: insertPersonalPropertySchema,
    updateSchema: updatePersonalPropertySchema,
})
