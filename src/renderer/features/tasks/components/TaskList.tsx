import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { isSameDay, parseISO } from 'date-fns'
import { useTaskStore } from '../store'
import { useScheduleStore } from '../../schedule/store'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'
import ScheduleDialog from './ScheduleDialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { ScrollArea } from '../../../components/ui/scroll-area'
import { useTranslation } from '../../../i18n'
import type { Task } from '../../../../types/models'

interface TaskListProps {
  title: string
  subtitle?: string
  // 'inbox' = list==='inbox'; 'today' = list==='today' / due today / scheduled today; undefined = all
  listFilter?: string
  showFilters?: boolean
  // Hide done tasks (Inbox / Today). Default true.
  hideDone?: boolean
}

export default function TaskList({ title, subtitle, listFilter, showFilters = true, hideDone = true }: TaskListProps) {
  const { t } = useTranslation()
  const { tasks, filters, loading, fetchTasks, setFilters } = useTaskStore()
  const { blocks, loadRange } = useScheduleStore()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasks()
    if (listFilter === 'today') {
      // Make sure schedule blocks for today are available so we can include
      // tasks that have been scheduled for today.
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      loadRange(start, end)
    }
  }, [listFilter])

  const handleEdit = useCallback((task: Task) => { setEditingTask(task); setShowForm(true) }, [])
  const handleSchedule = useCallback((task: Task) => { setSchedulingTask(task) }, [])

  useHotkeys('ctrl+n, meta+n', (e) => {
    e.preventDefault()
    setEditingTask(null)
    setShowForm(true)
  })

  // Tasks that have at least one schedule block today.
  const scheduledTodayIds = useMemo(() => {
    const today = new Date()
    const ids = new Set<string>()
    for (const b of blocks) {
      try {
        if (isSameDay(parseISO(b.start_time), today)) ids.add(b.task_id)
      } catch { /* skip invalid */ }
    }
    return ids
  }, [blocks])

  // Filter on the client by listFilter so we don't pollute the global store
  // filters (other views like Kanban / Matrix / Timeline read from the same store).
  const scopedTasks = useMemo(() => tasks.filter((task) => {
    if (hideDone && (task.status === 'done' || task.status === 'cancelled')) return false
    if (!listFilter) return true
    if (listFilter === 'today') {
      if (task.list === 'today') return true
      if (task.due_date) {
        try {
          if (isSameDay(parseISO(task.due_date), new Date())) return true
        } catch { /* invalid date */ }
      }
      if (scheduledTodayIds.has(task.id)) return true
      return false
    }
    return task.list === listFilter
  }), [tasks, hideDone, listFilter, scheduledTodayIds])

  const filteredTasks = useMemo(() => scopedTasks.filter((task) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!task.title.toLowerCase().includes(q) && !(task.description || '').toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  }), [scopedTasks, filters.search])

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
      </div>

      {/* Search & Add */}
      <div className="mb-4 flex items-center gap-3">
        {showFilters && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              placeholder={t('common.search')}
              aria-label={t('common.search')}
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        )}
        <Button onClick={() => { setEditingTask(null); setShowForm(true) }}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('tasks.newTask')}
        </Button>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500">
            {t('common.loading')}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <p className="text-sm">{t('common.noTasks')}</p>
            <p className="mt-1 text-xs">{t('common.createToStart')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onSchedule={handleSchedule}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Task form dialog */}
      <TaskForm
        open={showForm}
        task={editingTask}
        defaultList={listFilter}
        onClose={() => { setShowForm(false); setEditingTask(null) }}
      />

      {/* Smart scheduling dialog */}
      <ScheduleDialog
        open={!!schedulingTask}
        task={schedulingTask}
        onClose={() => setSchedulingTask(null)}
        onScheduled={() => { setSchedulingTask(null) }}
      />
    </div>
  )
}
