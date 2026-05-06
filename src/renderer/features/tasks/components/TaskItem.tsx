import { Timer, Calendar, Pencil, Trash2 } from 'lucide-react'
import { useTaskStore } from '../store'
import { usePomodoroStore } from '../../pomodoro/store'
import type { Task } from '../../../../types/models'
import { cn } from '../../../lib/utils'

interface TaskItemProps {
  task: Task
  onEdit: (task: Task) => void
  onSchedule: (task: Task) => void
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-neutral-500',
  2: 'bg-primary-500',
  3: 'bg-warning-500',
  4: 'bg-destructive-500',
}

const PRIORITY_LABELS: Record<number, string> = {
  1: '低',
  2: '中',
  3: '高',
  4: '紧急',
}

export default function TaskItem({ task, onEdit, onSchedule }: TaskItemProps) {
  const { markDone, markPending, deleteTask } = useTaskStore()
  const { startFocus } = usePomodoroStore()
  const isDone = task.status === 'done'

  const handleToggle = () => {
    if (isDone) {
      markPending(task.id)
    } else {
      markDone(task.id)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-neutral-200 hover:bg-neutral-50',
        isDone && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          isDone
            ? 'border-primary-500 bg-primary-500 text-white'
            : 'border-neutral-300 hover:border-primary-500'
        )}
      >
        {isDone && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Priority badge */}
      <span
        className={cn(
          'h-2 w-2 flex-shrink-0 rounded-full',
          PRIORITY_COLORS[task.priority] || 'bg-neutral-400'
        )}
        title={PRIORITY_LABELS[task.priority]}
      />

      {/* Title */}
      <span
        className={cn(
          'flex-1 truncate text-sm',
          isDone ? 'text-neutral-500 line-through' : 'text-neutral-900'
        )}
      >
        {task.title}
      </span>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Time info */}
      {task.estimated_minutes > 0 && (
        <span className="text-xs text-neutral-500">
          {task.actual_minutes > 0 ? `${task.actual_minutes}/` : ''}
          {task.estimated_minutes}min
        </span>
      )}

      {/* Due date */}
      {task.due_date && (
        <span className="text-xs text-neutral-500">
          {new Date(task.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
        </span>
      )}

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => startFocus(task.estimated_minutes || 25, task.id)}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-150 hover:text-neutral-900"
          title="开始番茄钟"
        >
          <Timer size={14} />
        </button>
        <button
          onClick={() => onSchedule(task)}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-150 hover:text-neutral-900"
          title="安排日程"
        >
          <Calendar size={14} />
        </button>
        <button
          onClick={() => onEdit(task)}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-150 hover:text-neutral-900"
          title="编辑"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => deleteTask(task.id)}
          className="rounded p-1 text-neutral-500 hover:bg-destructive-50 hover:text-destructive-500"
          title="删除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
