import { useEffect, useState } from 'react'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTaskStore } from '../tasks/store'
import KanbanColumn from './components/KanbanColumn'
import TaskForm from '../tasks/components/TaskForm'
import type { Task } from '../../../../types/models'

const columns = [
  { id: 'pending', title: '待办', status: 'pending' },
  { id: 'doing', title: '进行中', status: 'doing' },
  { id: 'done', title: '已完成', status: 'done' },
]

export default function KanbanBoard() {
  const { tasks, fetchTasks, updateTask } = useTaskStore()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => { fetchTasks() }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const newStatus = over.id as string
    const task = tasks.find((t) => t.id === taskId)
    if (task && task.status !== newStatus) {
      updateTask({ ...task, status: newStatus })
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">看板</h1>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status)
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={colTasks}
                count={colTasks.length}
                onEditTask={(t) => { setEditingTask(t); setShowForm(true) }}
              />
            )
          })}
        </div>
      </DndContext>

      <TaskForm open={showForm} task={editingTask} onClose={() => { setShowForm(false); setEditingTask(null) }} />
    </div>
  )
}
