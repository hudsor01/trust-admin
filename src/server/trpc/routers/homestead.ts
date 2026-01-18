import { getHomesteadById, homesteadCrud } from '../../../../db/queries'
import {
    insertHomesteadSchema,
    updateHomesteadSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const homesteadRouter = createCrudRouter({
    crud: homesteadCrud,
    insertSchema: insertHomesteadSchema,
    updateSchema: updateHomesteadSchema,
    getById: getHomesteadById,
})
