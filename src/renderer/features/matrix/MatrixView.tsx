import { useEffect } from 'react'
import { useTaskStore } from '../tasks/store'
import TaskItem from '../tasks/components/TaskItem'
import { PageHeader } from '../../components/ui/page-header'
import type { Task } from '../../../../types/models'

const quadrants = [
  { id: 'ui', label: '紧急且重要', color: 'border-destructive-300 bg-destructive-50', filter: (t: Task) => t.priority >= 4 },
  { id: 'ni', label: '重要不紧急', color: 'border-primary-300 bg-primary-50', filter: (t: Task) => t.priority === 3 },
  { id: 'un', label: '紧急不重要', color: 'border-warning-300 bg-warning-50', filter: (t: Task) => t.priority === 2 },
  { id: 'nn', label: '不紧急不重要', color: 'border-neutral-300 bg-neutral-50', filter: (t: Task) => t.priority <= 1 },
]

export default function MatrixView() {
  const { tasks, fetchTasks } = useTaskStore()

  useEffect(() => { fetchTasks() }, [])

  const pendingTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title="四象限" subtitle="按紧急/重要程度分类任务" />

      <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-3 overflow-hidden">
        {quadrants.map((q) => {
          const qTasks = pendingTasks.filter(q.filter)
          return (
            <div key={q.id} className={`flex flex-col rounded-xl border-2 ${q.color} overflow-hidden`}>
              <div className="border-b border-inherit px-4 py-2">
                <h3 className="text-sm font-semibold text-neutral-900">{q.label}</h3>
                <span className="text-xs text-neutral-500">{qTasks.length} 个任务</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {qTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onEdit={() => {}} />
                ))}
                {qTasks.length === 0 && (
                  <p className="py-4 text-center text-xs text-neutral-500">暂无</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
