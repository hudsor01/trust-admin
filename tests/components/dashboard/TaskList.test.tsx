/** TaskList component tests — grouped admin tasks with add, toggle, and notes functionality. */

import '../../setup'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskList } from '../../../src/app/(admin)/dashboard/_components/TaskList'

// Minimal task shape matching the component's internal Task interface
const makeTask = (
    overrides: Partial<{
        id: number
        title: string
        completed: boolean
        dueDate: string | null
        notes: string | null
        category: string
        sortOrder: number
        createdAt: string
        updatedAt: string
    }> = {},
) => ({
    id: 1,
    title: 'Review estate documents',
    completed: false,
    dueDate: null,
    notes: null,
    category: 'LEGAL',
    sortOrder: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
})

const defaultProps = {
    groupedTasks: [],
    newTaskTitle: '',
    newTaskCategory: 'ADMINISTRATIVE',
    expandedTask: null,
    today: new Date('2025-06-01'),
    onNewTaskTitleChange: mock((_: string) => {}),
    onNewTaskCategoryChange: mock((_: string) => {}),
    onExpandedTaskChange: mock((_: number | null) => {}),
    onAddTask: mock(() => {}),
    onToggleTask: mock((_: unknown) => {}),
    onUpdateTaskNotes: mock((_id: number, _notes: string) => {}),
}

describe('TaskList', () => {
    afterEach(() => {
        cleanup()
    })

    describe('empty state', () => {
        test('renders "No tasks yet" message when groupedTasks is empty', () => {
            render(<TaskList {...defaultProps} groupedTasks={[]} />)

            expect(
                screen.getByText('No tasks yet. Add your first task above.'),
            ).toBeTruthy()
        })

        test('does not render task cards when there are no tasks', () => {
            render(<TaskList {...defaultProps} groupedTasks={[]} />)

            // Category headers should not appear (only the Select dropdown for adding tasks is rendered)
            expect(screen.queryByText('Legal')).toBeNull()
            // "FINANCIAL" category header should not appear in the task list
            expect(screen.queryByText('Financial')).toBeNull()
        })
    })

    describe('add task input', () => {
        test('renders the task input with correct placeholder', () => {
            render(<TaskList {...defaultProps} />)

            expect(
                screen.getByPlaceholderText('Add a new task...'),
            ).toBeTruthy()
        })

        test('renders the Add button', () => {
            render(<TaskList {...defaultProps} />)

            expect(screen.getByRole('button', { name: /add/i })).toBeTruthy()
        })

        test('calls onNewTaskTitleChange when input value changes', async () => {
            const user = userEvent.setup()
            const onNewTaskTitleChange = mock((_: string) => {})

            render(
                <TaskList
                    {...defaultProps}
                    onNewTaskTitleChange={onNewTaskTitleChange}
                />,
            )

            const input = screen.getByPlaceholderText('Add a new task...')
            await user.type(input, 'New task')

            expect(onNewTaskTitleChange).toHaveBeenCalled()
        })

        test('calls onAddTask when Add button is clicked', async () => {
            const user = userEvent.setup()
            const onAddTask = mock(() => {})

            render(<TaskList {...defaultProps} onAddTask={onAddTask} />)

            await user.click(screen.getByRole('button', { name: /add/i }))
            expect(onAddTask).toHaveBeenCalledTimes(1)
        })

        test('calls onAddTask when Enter key is pressed in the input', async () => {
            const user = userEvent.setup()
            const onAddTask = mock(() => {})

            render(
                <TaskList
                    {...defaultProps}
                    newTaskTitle="My new task"
                    onAddTask={onAddTask}
                />,
            )

            const input = screen.getByPlaceholderText('Add a new task...')
            await user.click(input)
            await user.keyboard('{Enter}')

            expect(onAddTask).toHaveBeenCalledTimes(1)
        })
    })

    describe('task rendering with groupedTasks', () => {
        const groupedTasks = [
            {
                value: 'LEGAL',
                label: 'Legal',
                tasks: [
                    makeTask({
                        id: 1,
                        title: 'File probate petition',
                        category: 'LEGAL',
                    }),
                    makeTask({
                        id: 2,
                        title: 'Review trust documents',
                        category: 'LEGAL',
                        completed: true,
                    }),
                ],
            },
        ]

        test('renders the category header label', () => {
            render(<TaskList {...defaultProps} groupedTasks={groupedTasks} />)

            expect(screen.getByText('Legal')).toBeTruthy()
        })

        test('renders individual task titles', () => {
            render(<TaskList {...defaultProps} groupedTasks={groupedTasks} />)

            expect(screen.getByText('File probate petition')).toBeTruthy()
            expect(screen.getByText('Review trust documents')).toBeTruthy()
        })

        test('renders task completion count in category header', () => {
            render(<TaskList {...defaultProps} groupedTasks={groupedTasks} />)

            // 1 completed out of 2
            expect(screen.getByText('1 of 2 tasks')).toBeTruthy()
        })

        test('renders checkboxes for each task', () => {
            render(<TaskList {...defaultProps} groupedTasks={groupedTasks} />)

            const checkboxes = screen.getAllByRole('checkbox')
            expect(checkboxes.length).toBe(2)
        })
    })

    describe('multiple categories', () => {
        const multiGroupedTasks = [
            {
                value: 'LEGAL',
                label: 'Legal',
                tasks: [
                    makeTask({ id: 1, title: 'Legal task', category: 'LEGAL' }),
                ],
            },
            {
                value: 'FINANCIAL',
                label: 'Financial',
                tasks: [
                    makeTask({
                        id: 2,
                        title: 'Financial task',
                        category: 'FINANCIAL',
                    }),
                ],
            },
        ]

        test('renders all category headers', () => {
            render(
                <TaskList {...defaultProps} groupedTasks={multiGroupedTasks} />,
            )

            expect(screen.getByText('Legal')).toBeTruthy()
            expect(screen.getByText('Financial')).toBeTruthy()
        })

        test('renders tasks from all categories', () => {
            render(
                <TaskList {...defaultProps} groupedTasks={multiGroupedTasks} />,
            )

            expect(screen.getByText('Legal task')).toBeTruthy()
            expect(screen.getByText('Financial task')).toBeTruthy()
        })
    })

    describe('task interaction', () => {
        const groupedTasks = [
            {
                value: 'ADMINISTRATIVE',
                label: 'Administrative',
                tasks: [makeTask({ id: 10, title: 'Send correspondence' })],
            },
        ]

        test('calls onExpandedTaskChange when a task row is clicked', async () => {
            const user = userEvent.setup()
            const onExpandedTaskChange = mock((_: number | null) => {})

            render(
                <TaskList
                    {...defaultProps}
                    groupedTasks={groupedTasks}
                    onExpandedTaskChange={onExpandedTaskChange}
                />,
            )

            // Click the task title text to expand
            await user.click(screen.getByText('Send correspondence'))
            expect(onExpandedTaskChange).toHaveBeenCalledWith(10)
        })

        test('shows notes textarea when task is expanded', () => {
            render(
                <TaskList
                    {...defaultProps}
                    groupedTasks={groupedTasks}
                    expandedTask={10}
                />,
            )

            expect(screen.getByPlaceholderText('Add notes...')).toBeTruthy()
        })

        test('does not show notes textarea when task is not expanded', () => {
            render(
                <TaskList
                    {...defaultProps}
                    groupedTasks={groupedTasks}
                    expandedTask={null}
                />,
            )

            expect(screen.queryByPlaceholderText('Add notes...')).toBeNull()
        })

        test('calls onToggleTask when checkbox is clicked', async () => {
            const user = userEvent.setup()
            const onToggleTask = mock((_: unknown) => {})

            render(
                <TaskList
                    {...defaultProps}
                    groupedTasks={groupedTasks}
                    onToggleTask={onToggleTask}
                />,
            )

            const checkbox = screen.getByRole('checkbox')
            await user.click(checkbox)
            expect(onToggleTask).toHaveBeenCalledTimes(1)
        })
    })

    describe('overdue tasks', () => {
        test('shows "Overdue" label for tasks past due date that are not completed', () => {
            const overdueTasks = [
                {
                    value: 'LEGAL',
                    label: 'Legal',
                    tasks: [
                        makeTask({
                            id: 5,
                            title: 'Past due task',
                            dueDate: '2020-01-01',
                            completed: false,
                        }),
                    ],
                },
            ]

            render(
                <TaskList
                    {...defaultProps}
                    groupedTasks={overdueTasks}
                    today={new Date('2025-06-01')}
                />,
            )

            // The due date line renders "· Overdue" when past due
            const overdueElements = screen.getAllByText(/Overdue/)
            expect(overdueElements.length).toBeGreaterThan(0)
        })
    })
})
