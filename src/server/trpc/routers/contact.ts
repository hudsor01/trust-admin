import { contactCrud } from '../../../../db/queries'
import {
    insertContactSchema,
    updateContactSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const contactRouter = createCrudRouter({
    crud: contactCrud,
    insertSchema: insertContactSchema,
    updateSchema: updateContactSchema,
})
