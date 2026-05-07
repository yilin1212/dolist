import { useEffect, useMemo } from 'react'
import { format, parseISO, isToday, isTomorrow, addDays, differenceInMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Timer, ChevronUp, ChevronDown, X } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { useTranslation } from '../../i18n'
import { useTaskStore } from '../tasks/store'
import { useScheduleStore } from '../schedule/store'
import { usePomodoroStore } from '../pomodoro/store'
import type { ScheduleBlock } from '../../../../types/models'

export default function UpcomingView() {
  const { t, locale } = useTranslation()
  const { tasks, fetchTasks } = useTaskStore()
  const { blocks, loadRange, deleteBlock, updateBlock } = useScheduleStore()
  const startFocus = usePomodoroStore((s) => s.startFocus)

  const taskMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const task of tasks) {
      map[task.id] = task.title
    }
    return map
  }, [tasks])

  useEffect(() => {
    fetchTasks()
    const start = new Date().toISOString()
    const end = addDays(new Date(), 7).toISOString()
    loadRange(start, end)
  }, [])

  // Filter out blocks whose task has been deleted
  const validBlocks = blocks.filter((b) => taskMap[b.task_id])

  // Group blocks by date (use a Map to preserve sort order from the SQL query)
  const grouped = new Map<string, ScheduleBlock[]>()
  for (const block of validBlocks) {
    const date = format(parseISO(block.start_time), 'yyyy-MM-dd')
    const arr = grouped.get(date) || []
    arr.push(block)
    grouped.set(date, arr)
  }

  const dateLabel = (dateStr: string) => {
    const d = parseISO(dateStr)
    if (isToday(d)) return t('common.today')
    if (isTomorrow(d)) return t('common.tomorrow')
    return format(d, locale === 'zh-CN' ? 'M月d日 EEEE' : 'EEE, MMM d', { locale: locale === 'zh-CN' ? zhCN : undefined })
  }

  const swapBlocks = async (a: ScheduleBlock, b: ScheduleBlock) => {
    await updateBlock({ ...a, start_time: b.start_time, end_time: b.end_time })
    await updateBlock({ ...b, start_time: a.start_time, end_time: a.end_time })
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('schedule.deleteBlockConfirm'))) return
    await deleteBlock(id)
  }

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title={t('upcoming.title')} subtitle={t('upcoming.subtitle')} />

      <div className="flex-1 overflow-y-auto space-y-6">
        {grouped.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <p className="text-sm">{t('common.noUpcoming')}</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([date, dayBlocks]) => (
            <div key={date}>
              <h3 className="mb-2 text-sm font-semibold text-neutral-700">{dateLabel(date)}</h3>
              <div className="space-y-1.5">
                {dayBlocks.map((block, idx) => {
                  const start = parseISO(block.start_time)
                  const end = parseISO(block.end_time)
                  const minutes = Math.max(1, differenceInMinutes(end, start))
                  const prev = idx > 0 ? dayBlocks[idx - 1] : null
                  const next = idx < dayBlocks.length - 1 ? dayBlocks[idx + 1] : null
                  return (
                    <div key={block.id} className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5">
                      <span className="text-sm font-medium text-neutral-900">
                        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                      </span>
                      <span className="flex-1 truncate text-sm text-neutral-600">{taskMap[block.task_id]}</span>
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        block.status === 'done' ? 'bg-success-50 text-success-500' : 'bg-primary-50 text-primary-500'
                      }`}>
                        {block.status === 'done' ? t('common.done') : t('common.pending')}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => prev && swapBlocks(block, prev)}
                          disabled={!prev}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('schedule.moveUp')}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => next && swapBlocks(block, next)}
                          disabled={!next}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('schedule.moveDown')}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => startFocus(minutes, block.task_id, block.id)}
                          className="rounded p-1 text-neutral-400 hover:bg-primary-50 hover:text-primary-600"
                          title={t('common.startPomodoro')}
                        >
                          <Timer size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(block.id)}
                          className="rounded p-1 text-neutral-400 hover:bg-destructive-50 hover:text-destructive-500"
                          title={t('common.delete')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
