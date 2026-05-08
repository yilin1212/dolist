import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { useTaskStore } from '../tasks/store'
import KanbanColumn from './components/KanbanColumn'
import KanbanCard from './components/KanbanCard'
import TaskForm from '../tasks/components/TaskForm'
import { useTranslation } from '../../i18n'
import type { Task } from '../../../../types/models'

const COLUMN_STATUSES = ['pending', 'doing', 'done'] as const
type ColumnStatus = (typeof COLUMN_STATUSES)[number]

// Custom collision detection: prefer pointer-within (most intuitive when
// dropping onto a card or column area) and fall back to rectIntersection so
// drops near the edge of an empty column still resolve to that column.
const collision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args)
  if (pointer.length > 0) return pointer
  return rectIntersection(args)
}

export default function KanbanBoard() {
  const { t } = useTranslation()
  const { tasks, loading, fetchTasks, updateTask } = useTaskStore()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const columns = useMemo<Array<{ id: ColumnStatus; title: string; status: ColumnStatus }>>(() => [
    { id: 'pending', title: t('kanban.columns.pending'), status: 'pending' },
    { id: 'doing', title: t('kanban.columns.doing'), status: 'doing' },
    { id: 'done', title: t('kanban.columns.done'), status: 'done' },
  ], [t])

  useEffect(() => { fetchTasks() }, [])

  useHotkeys('ctrl+n, meta+n', (e) => {
    e.preventDefault()
    setEditingTask(null)
    setShowForm(true)
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Sort tasks within their column by sort_order then created_at.
  const tasksByColumn = useMemo(() => {
    const map: Record<ColumnStatus, Task[]> = { pending: [], doing: [], done: [] }
    for (const task of tasks) {
      const status = (COLUMN_STATUSES as readonly string[]).includes(task.status)
        ? (task.status as ColumnStatus)
        : null
      if (status) map[status].push(task)
    }
    for (const key of COLUMN_STATUSES) {
      map[key].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return b.created_at.localeCompare(a.created_at)
      })
    }
    return map
  }, [tasks])

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) || null : null

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setShowForm(false)
    setEditingTask(null)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragCancel = useCallback(() => setActiveId(null), [])

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const overId = over.id as string

    const dragged = tasks.find((t) => t.id === taskId)
    if (!dragged) return

    // Resolve target column from either column id or the over-task's status.
    let targetCol: ColumnStatus | null = null
    let overTaskIdx = -1
    if ((COLUMN_STATUSES as readonly string[]).includes(overId)) {
      targetCol = overId as ColumnStatus
    } else {
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask && (COLUMN_STATUSES as readonly string[]).includes(overTask.status)) {
        targetCol = overTask.status as ColumnStatus
        overTaskIdx = tasksByColumn[targetCol].findIndex((t) => t.id === overId)
      }
    }
    if (!targetCol) return

    // Build a fresh order for the target column with the dragged task placed
    // at the appropriate index. This handles both within-column reorder and
    // cross-column drop.
    const colTasks = tasksByColumn[targetCol].filter((t) => t.id !== taskId)
    if (overTaskIdx === -1) {
      // Dropped on the column itself (empty area) — append to end
      colTasks.push(dragged)
    } else {
      // Insert before the over task (since indices shifted after filter, just use overTaskIdx
      // adjusted: if dragged was previously above overTask in same column, idx is already correct)
      const insertAt = colTasks.findIndex((t) => t.id === overId)
      colTasks.splice(insertAt >= 0 ? insertAt : colTasks.length, 0, dragged)
    }

    const statusChanged = dragged.status !== targetCol
    const now = Date.now()

    // Persist new sort_order for every task in the target column. Use widely
    // spaced integers to avoid collisions and keep diffs small.
    const updates: Promise<void>[] = []
    for (let idx = 0; idx < colTasks.length; idx++) {
      const task = colTasks[idx]
      const newOrder = (idx + 1) * 1000
      const needsStatusUpdate = task.id === taskId && statusChanged
      const orderUnchanged = task.sort_order === newOrder
      if (orderUnchanged && !needsStatusUpdate) continue
      updates.push(
        updateTask({
          ...task,
          status: needsStatusUpdate ? targetCol! : task.status,
          sort_order: newOrder,
          completed_at: needsStatusUpdate && targetCol === 'done'
            ? new Date(now).toISOString()
            : (task.id === taskId && targetCol !== 'done' ? null : task.completed_at),
        })
      )
    }
    if (updates.length > 0) {
      try {
        await Promise.all(updates)
      } catch (e) {
        console.error('Failed to persist drag reorder:', e)
      }
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('kanban.title')}</h1>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-neutral-500">{t('common.loading')}</div>
          ) : columns.map((col) => {
            const colTasks = tasksByColumn[col.status]
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={colTasks}
                count={colTasks.length}
                onEditTask={handleEditTask}
              />
            )
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <KanbanCard task={activeTask} onEdit={() => {}} dragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskForm open={showForm} task={editingTask} onClose={handleCloseForm} />
    </div>
  )
}
