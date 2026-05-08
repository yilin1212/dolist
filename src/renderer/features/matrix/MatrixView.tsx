import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useTaskStore } from '../tasks/store'
import TaskItem from '../tasks/components/TaskItem'
import TaskForm from '../tasks/components/TaskForm'
import ScheduleDialog from '../tasks/components/ScheduleDialog'
import { PageHeader } from '../../components/ui/page-header'
import { useTranslation } from '../../i18n'
import type { Task } from '../../../../types/models'

type QuadrantId = 'ui' | 'ni' | 'un' | 'nn'

const QUADRANT_PRIORITY: Record<QuadrantId, number> = {
  ui: 4, // Urgent & Important
  ni: 3, // Important, Not Urgent
  un: 2, // Urgent, Not Important
  nn: 1, // Neither
}

function priorityToQuadrant(priority: number): QuadrantId {
  if (priority >= 4) return 'ui'
  if (priority === 3) return 'ni'
  if (priority === 2) return 'un'
  return 'nn'
}

const collision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args)
  if (pointer.length > 0) return pointer
  return rectIntersection(args)
}

export default function MatrixView() {
  const { t } = useTranslation()
  const { tasks, loading, fetchTasks, updateTask } = useTaskStore()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => { fetchTasks() }, [])

  useHotkeys('ctrl+n, meta+n', (e) => {
    e.preventDefault()
    setEditingTask(null)
    setShowForm(true)
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== 'done' && task.status !== 'cancelled'), [tasks])

  const quadrants = useMemo<Array<{ id: QuadrantId; label: string; color: string }>>(() => [
    { id: 'ui', label: t('matrix.quadrants.urgentImportant'), color: 'border-destructive-300 bg-destructive-50' },
    { id: 'ni', label: t('matrix.quadrants.importantNotUrgent'), color: 'border-primary-300 bg-primary-50' },
    { id: 'un', label: t('matrix.quadrants.urgentNotImportant'), color: 'border-warning-300 bg-warning-50' },
    { id: 'nn', label: t('matrix.quadrants.notUrgentNotImportant'), color: 'border-neutral-300 bg-neutral-50' },
  ], [t])

  const tasksByQuadrant = useMemo(() => {
    const map: Record<QuadrantId, Task[]> = { ui: [], ni: [], un: [], nn: [] }
    for (const task of pendingTasks) {
      map[priorityToQuadrant(task.priority)].push(task)
    }
    return map
  }, [pendingTasks])

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) || null : null

  const handleEdit = useCallback((task: Task) => { setEditingTask(task); setShowForm(true) }, [])
  const handleSchedule = useCallback((task: Task) => { setSchedulingTask(task) }, [])
  const handleCloseForm = useCallback(() => { setShowForm(false); setEditingTask(null) }, [])
  const handleCloseSchedule = useCallback(() => setSchedulingTask(null), [])

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), [])
  const handleDragCancel = useCallback(() => setActiveId(null), [])

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const overId = over.id as string

    // overId may be a quadrant id or a task id (when dropped on a card)
    let targetQ: QuadrantId | null = null
    if (overId in QUADRANT_PRIORITY) {
      targetQ = overId as QuadrantId
    } else {
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) targetQ = priorityToQuadrant(overTask.priority)
    }
    if (!targetQ) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const newPriority = QUADRANT_PRIORITY[targetQ]
    if (task.priority !== newPriority) {
      try {
        await updateTask({ ...task, priority: newPriority })
      } catch (e) {
        console.error('Failed to update task priority:', e)
      }
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title={t('matrix.title')} subtitle={t('matrix.subtitle')} />

      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-3 overflow-hidden">
          {loading ? (
            <div className="col-span-2 row-span-2 flex items-center justify-center text-neutral-500">{t('common.loading')}</div>
          ) : quadrants.map((q) => (
            <Quadrant
              key={q.id}
              id={q.id}
              label={q.label}
              color={q.color}
              tasks={tasksByQuadrant[q.id]}
              onEdit={handleEdit}
              onSchedule={handleSchedule}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="rounded-lg border border-primary-300 bg-white px-3 py-2 text-sm shadow-xl ring-2 ring-primary-200">
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskForm
        open={showForm}
        task={editingTask}
        onClose={handleCloseForm}
      />
      <ScheduleDialog
        open={!!schedulingTask}
        task={schedulingTask}
        onClose={handleCloseSchedule}
        onScheduled={() => { handleCloseSchedule(); fetchTasks() }}
      />
    </div>
  )
}

interface QuadrantProps {
  id: QuadrantId
  label: string
  color: string
  tasks: Task[]
  onEdit: (task: Task) => void
  onSchedule: (task: Task) => void
}

const Quadrant = memo(function Quadrant({ id, label, color, tasks, onEdit, onSchedule }: QuadrantProps) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-2 ${color} overflow-hidden transition-shadow ${isOver ? 'ring-2 ring-primary-400' : ''}`}
    >
      <div className="border-b border-inherit px-4 py-2">
        <h3 className="text-sm font-semibold text-neutral-900">{label}</h3>
        <span className="text-xs text-neutral-500">{tasks.length} {t('matrix.taskCount')}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} onEdit={onEdit} onSchedule={onSchedule} />
        ))}
        {tasks.length === 0 && (
          <p className="py-4 text-center text-xs text-neutral-500">{t('matrix.none')}</p>
        )}
      </div>
    </div>
  )
})

interface DraggableTaskProps {
  task: Task
  onEdit: (task: Task) => void
  onSchedule: (task: Task) => void
}

const DraggableTask = memo(function DraggableTask({ task, onEdit, onSchedule }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-30' : ''}
      onPointerDown={(e) => {
        // Allow buttons inside TaskItem to receive clicks without initiating drag
        const target = e.target as HTMLElement
        if (target.closest('button')) {
          e.stopPropagation()
          return
        }
        listeners?.onPointerDown?.(e)
      }}
    >
      <TaskItem task={task} onEdit={onEdit} onSchedule={onSchedule} />
    </div>
  )
})
