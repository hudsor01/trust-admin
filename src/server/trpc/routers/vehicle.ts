import { getVehicleById, vehicleCrud } from '../../../../db/queries'
import {
    insertVehicleSchema,
    updateVehicleSchema,
} from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const vehicleRouter = createCrudRouter({
    crud: vehicleCrud,
    insertSchema: insertVehicleSchema,
    updateSchema: updateVehicleSchema,
    getById: getVehicleById,
})
