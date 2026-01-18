import { artworkCrud } from '../../../../db/queries'
import {
    insertArtworkSchema,
    updateArtworkSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const artworkRouter = createCrudRouter({
    crud: artworkCrud,
    insertSchema: insertArtworkSchema,
    updateSchema: updateArtworkSchema,
})
