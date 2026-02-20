'use client'

import {
    ChevronDown,
    ChevronUp,
    FileText,
    Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/formatters'
import { TASK_CATEGORIES } from './constants'

interface Task {
    id: number
    title: string
    completed: boolean
    dueDate: string | null
    notes: string | null
    category: string
    sortOrder: number
    createdAt: string
    updatedAt: string
}

interface GroupedCategory {
    value: string
    label: string
    tasks: Task[]
}

interface TaskListProps {
    groupedTasks: GroupedCategory[]
    newTaskTitle: string
    newTaskCategory: string
    expandedTask: number | null
    today: Date
    onNewTaskTitleChange: (value: string) => void
    onNewTaskCategoryChange: (value: string) => void
    onExpandedTaskChange: (id: number | null) => void
    onAddTask: () => void
    onToggleTask: (task: Task) => void
    onUpdateTaskNotes: (taskId: number, notes: string) => void
}

export function TaskList({
    groupedTasks,
    newTaskTitle,
    newTaskCategory,
    expandedTask,
    today,
    onNewTaskTitleChange,
    onNewTaskCategoryChange,
    onExpandedTaskChange,
    onAddTask,
    onToggleTask,
    onUpdateTaskNotes,
}: TaskListProps) {
    return (
        <div className="space-y-6">
            {/* Add Task */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <Input
                            placeholder="Add a new task..."
                            value={newTaskTitle}
                            onChange={(e) =>
                                onNewTaskTitleChange(e.target.value)
                            }
                            onKeyDown={(e) =>
                                e.key === 'Enter' && onAddTask()
                            }
                            className="flex-1"
                        />
                        <Select
                            value={newTaskCategory}
                            onValueChange={onNewTaskCategoryChange}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TASK_CATEGORIES.map((c) => (
                                    <SelectItem
                                        key={c.value}
                                        value={c.value}
                                    >
                                        {c.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={onAddTask}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Task List by Category */}
            {groupedTasks.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                            No tasks yet. Add your first task above.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                groupedTasks.map((category) => (
                    <div key={category.value}>
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                                {category.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {category.tasks.filter((t) => t.completed).length}{' '}
                                of {category.tasks.length} tasks
                            </p>
                        </div>

                        {/* Task Card */}
                        <Card>
                            <div className="divide-y">
                                {category.tasks.map((task) => {
                                    const isOverdue =
                                        task.dueDate &&
                                        new Date(task.dueDate) < today &&
                                        !task.completed

                                    return (
                                        <div key={task.id}>
                                            <div
                                                className={cn(
                                                    'flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50',
                                                    expandedTask === task.id &&
                                                        'bg-muted/50',
                                                )}
                                                onClick={() =>
                                                    onExpandedTaskChange(
                                                        expandedTask === task.id
                                                            ? null
                                                            : task.id,
                                                    )
                                                }
                                            >
                                                <Checkbox
                                                    checked={
                                                        task.completed ?? false
                                                    }
                                                    onCheckedChange={() =>
                                                        onToggleTask(task)
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                />
                                                <div className="flex-1">
                                                    <p
                                                        className={cn(
                                                            'text-sm',
                                                            task.completed &&
                                                                'line-through text-muted-foreground',
                                                        )}
                                                    >
                                                        {task.title}
                                                    </p>
                                                    {task.dueDate && (
                                                        <p
                                                            className={cn(
                                                                'text-xs mt-0.5',
                                                                isOverdue
                                                                    ? 'text-amber-600 dark:text-amber-400'
                                                                    : 'text-muted-foreground',
                                                            )}
                                                        >
                                                            Due{' '}
                                                            {formatDate(
                                                                task.dueDate,
                                                            )}
                                                            {isOverdue &&
                                                                ' · Overdue'}
                                                        </p>
                                                    )}
                                                </div>
                                                {task.notes && (
                                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                )}
                                                {expandedTask === task.id ? (
                                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                            {expandedTask === task.id && (
                                                <div className="px-4 pb-4 pt-0 ml-10">
                                                    <Textarea
                                                        placeholder="Add notes..."
                                                        value={
                                                            task.notes || ''
                                                        }
                                                        onChange={(e) =>
                                                            onUpdateTaskNotes(
                                                                task.id,
                                                                e.target.value,
                                                            )
                                                        }
                                                        rows={2}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>
                ))
            )}
        </div>
    )
}
