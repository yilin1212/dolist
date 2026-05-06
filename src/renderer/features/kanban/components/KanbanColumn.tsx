import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanCard from './KanbanCard'
import type { Task } from '../../../../../types/models'
import { cn } from '../../../lib/utils'

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  count: number
  onEditTask: (task: Task) => void
}

export default function KanbanColumn({ id, title, tasks, count, onEditTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 flex-shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50',
        isOver && 'border-primary-500 bg-primary-50'
      )}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
          {count}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onEdit={() => onEditTask(task)} />
          ))}
          {tasks.length === 0 && (
            <p className="py-8 text-center text-xs text-neutral-500">暂无任务</p>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
