import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useTaskStore } from '../store'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'
import ScheduleDialog from './ScheduleDialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { ScrollArea } from '../../../components/ui/scroll-area'

interface TaskListProps {
  title: string
  subtitle?: string
  listFilter?: string
  showFilters?: boolean
}

export default function TaskList({ title, subtitle, listFilter, showFilters = true }: TaskListProps) {
  const { tasks, filters, loading, fetchTasks, setFilters } = useTaskStore()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [schedulingTask, setSchedulingTask] = useState<any>(null)

  useEffect(() => {
    if (listFilter) {
      setFilters({ list: listFilter })
    }
    fetchTasks()
  }, [listFilter])

  const filteredTasks = tasks.filter((t) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })

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
              placeholder="搜索任务..."
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        )}
        <Button onClick={() => { setEditingTask(null); setShowForm(true) }}>
          <Plus className="mr-1.5 h-4 w-4" />
          新建任务
        </Button>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500">
            加载中...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <p className="text-sm">暂无任务</p>
            <p className="mt-1 text-xs">点击「新建任务」开始</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={(t) => { setEditingTask(t); setShowForm(true) }}
                onSchedule={(t) => setSchedulingTask(t)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Task form dialog */}
      <TaskForm
        open={showForm}
        task={editingTask}
        onClose={() => { setShowForm(false); setEditingTask(null) }}
      />

      {/* Smart scheduling dialog */}
      <ScheduleDialog
        open={!!schedulingTask}
        task={schedulingTask}
        onClose={() => setSchedulingTask(null)}
        onScheduled={() => { setSchedulingTask(null); fetchTasks() }}
      />
    </div>
  )
}
