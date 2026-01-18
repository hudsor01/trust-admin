import { taskCrud } from '../../../../db/queries'
import { insertTaskSchema, updateTaskSchema } from '../../../../db/validation'
import { createCrudRouter } from '../index'

export const taskRouter = createCrudRouter({
    crud: taskCrud,
    insertSchema: insertTaskSchema,
    updateSchema: updateTaskSchema,
})
