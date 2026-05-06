import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil } from 'lucide-react'
import type { Task } from '../../../../../types/models'
import { cn } from '../../../lib/utils'

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-neutral-500', 2: 'bg-primary-500', 3: 'bg-warning-500', 4: 'bg-destructive-500',
}

interface KanbanCardProps {
  task: Task
  onEdit: () => void
}

export default function KanbanCard({ task, onEdit }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group cursor-grab rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn('mt-1 h-2 w-2 flex-shrink-0 rounded-full', PRIORITY_COLORS[task.priority])} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{task.title}</p>
          {task.tags && task.tags.length > 0 && (
            <div className="mt-1.5 flex gap-1">
              {task.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {task.due_date && (
            <p className="mt-1 text-xs text-neutral-500">
              {new Date(task.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-neutral-600 group-hover:opacity-100"
        >
          <Pencil size={12} />
        </button>
      </div>
    </div>
  )
}
