import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Timer } from 'lucide-react'
import type { Task } from '../../../../../types/models'
import { cn } from '../../../lib/utils'
import { useTranslation } from '../../../i18n'
import { usePomodoroStore } from '../../pomodoro/store'

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-neutral-500', 2: 'bg-primary-500', 3: 'bg-warning-500', 4: 'bg-destructive-500',
}

interface KanbanCardProps {
  task: Task
  onEdit: () => void
  dragOverlay?: boolean
}

export default function KanbanCard({ task, onEdit, dragOverlay }: KanbanCardProps) {
  const { locale, t } = useTranslation()
  const startFocus = usePomodoroStore((s) => s.startFocus)
  const sortable = useSortable({ id: task.id, disabled: dragOverlay })
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable

  const style = dragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  // Prevent button clicks from initiating a drag
  const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation()

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={style}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      className={cn(
        'group cursor-grab rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && !dragOverlay && 'opacity-30',
        dragOverlay && 'cursor-grabbing shadow-xl ring-2 ring-primary-300'
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
              {new Date(task.due_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        {!dragOverlay && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onPointerDown={stop}
              onClick={(e) => { e.stopPropagation(); startFocus(task.estimated_minutes || 25, task.id) }}
              className="rounded p-1 text-neutral-400 hover:bg-primary-50 hover:text-primary-600"
              title={t('common.startPomodoro')}
            >
              <Timer size={12} />
            </button>
            <button
              onPointerDown={stop}
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              title={t('common.edit')}
            >
              <Pencil size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
