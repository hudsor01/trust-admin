import { specificBequestCrud } from '../../../../db/queries'
import {
    insertSpecificBequestSchema,
    updateSpecificBequestSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const specificBequestRouter = createCrudRouter({
    crud: specificBequestCrud,
    insertSchema: insertSpecificBequestSchema,
    updateSchema: updateSpecificBequestSchema,
})
