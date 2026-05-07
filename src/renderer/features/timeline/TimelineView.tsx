import { useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Timer, X } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { useTranslation } from '../../i18n'
import { useTaskStore } from '../tasks/store'
import { useScheduleStore } from '../schedule/store'
import { usePomodoroStore } from '../pomodoro/store'

export default function TimelineView() {
  const { t, locale } = useTranslation()
  const { tasks, fetchTasks } = useTaskStore()
  const { blocks, loadRange, deleteBlock } = useScheduleStore()
  const startFocus = usePomodoroStore((s) => s.startFocus)
  const hours = Array.from({ length: 15 }, (_, i) => i + 8) // 8:00 - 22:00

  const taskMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const task of tasks) {
      map[task.id] = task.title
    }
    return map
  }, [tasks])

  useEffect(() => {
    fetchTasks()
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
    loadRange(start, end)
  }, [])

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Filter out blocks whose task has been deleted
  const validBlocks = blocks.filter((b) => taskMap[b.task_id])

  const handleDelete = async (id: string) => {
    if (!confirm(t('schedule.deleteBlockConfirm'))) return
    await deleteBlock(id)
  }

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title={t('timeline.title')} subtitle={format(new Date(), locale === 'zh-CN' ? 'yyyy年M月d日 EEEE' : 'EEEE, MMM d, yyyy', { locale: locale === 'zh-CN' ? zhCN : undefined })} />

      <div className="flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="flex border-b border-neutral-100" style={{ height: 64 }}>
              <div className="w-16 flex-shrink-0 border-r border-neutral-100 pr-2 pt-1 text-right text-xs text-neutral-500">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="flex-1 relative">
                {validBlocks
                  .filter((b) => {
                    const h = new Date(b.start_time).getHours()
                    return h === hour
                  })
                  .map((block) => {
                    const start = new Date(block.start_time)
                    const end = new Date(block.end_time)
                    const durationMin = (end.getTime() - start.getTime()) / 60000
                    const height = Math.max(24, (durationMin / 60) * 64)
                    return (
                      <div
                        key={block.id}
                        className="group absolute left-2 right-2 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs text-primary-700"
                        style={{ height, top: (start.getMinutes() / 60) * 64 }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="flex-1 truncate font-medium">{taskMap[block.task_id]}</p>
                          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => startFocus(Math.max(1, Math.round(durationMin)), block.task_id, block.id)}
                              className="rounded p-0.5 hover:bg-primary-100"
                              title={t('common.startPomodoro')}
                            >
                              <Timer size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(block.id)}
                              className="rounded p-0.5 text-primary-700 hover:bg-destructive-100 hover:text-destructive-600"
                              title={t('common.delete')}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-primary-500">
                          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                        </p>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {currentHour >= 8 && currentHour <= 22 && (
            <div
              className="absolute left-16 right-0 z-10 flex items-center"
              style={{ top: (currentHour - 8) * 64 + (currentMinute / 60) * 64 }}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-destructive-500" />
              <div className="flex-1 h-px bg-destructive-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
