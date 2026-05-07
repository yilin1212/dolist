import { useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, isSameDay, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Timer, ChevronUp, ChevronDown, X } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { useTranslation } from '../../i18n'
import { useScheduleStore } from '../schedule/store'
import { useTaskStore } from '../tasks/store'
import { usePomodoroStore } from '../pomodoro/store'
import 'react-day-picker/dist/style.css'

export default function CalendarView() {
  const { t, locale } = useTranslation()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const { blocks, loadRange, deleteBlock, updateBlock } = useScheduleStore()
  const { tasks, fetchTasks } = useTaskStore()
  const startFocus = usePomodoroStore((s) => s.startFocus)

  useEffect(() => {
    fetchTasks()
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString()
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1).toISOString()
    loadRange(start, end)
  }, [selectedDate])

  const taskMap = useMemo(() => {
    const map: Record<string, { title: string; estimated: number }> = {}
    for (const task of tasks) {
      map[task.id] = { title: task.title, estimated: task.estimated_minutes }
    }
    return map
  }, [tasks])

  // Drop orphan blocks whose task has been deleted (defensive — task delete
  // should already cascade)
  const validBlocks = blocks.filter((b) => taskMap[b.task_id])

  const dayBlocks = validBlocks
    .filter((b) => {
      try {
        return isSameDay(parseISO(b.start_time), selectedDate)
      } catch { return false }
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  // Swap the time slots of two blocks (move-up / move-down).
  const swapBlocks = async (a: typeof dayBlocks[number], b: typeof dayBlocks[number]) => {
    await updateBlock({ ...a, start_time: b.start_time, end_time: b.end_time })
    await updateBlock({ ...b, start_time: a.start_time, end_time: a.end_time })
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('schedule.deleteBlockConfirm'))) return
    await deleteBlock(id)
  }

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title={t('calendar.title')} />

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Calendar */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            locale={locale === 'zh-CN' ? zhCN : undefined}
            modifiers={{
              hasBlock: (date) => validBlocks.some((b) => {
                try { return isSameDay(parseISO(b.start_time), date) } catch { return false }
              }),
            }}
            modifiersStyles={{
              hasBlock: { backgroundColor: '#E8F2FC', borderRadius: '50%' },
            }}
          />
        </div>

        {/* Day detail */}
        <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-4 overflow-y-auto">
          <h3 className="mb-4 text-lg font-semibold">
            {format(selectedDate, locale === 'zh-CN' ? 'yyyy年M月d日 EEEE' : 'EEEE, MMM d, yyyy', { locale: locale === 'zh-CN' ? zhCN : undefined })}
          </h3>
          {dayBlocks.length === 0 ? (
            <p className="text-sm text-neutral-500">{t('common.noSchedule')}</p>
          ) : (
            <div className="space-y-2">
              {dayBlocks.map((block, idx) => {
                const info = taskMap[block.task_id]
                const start = parseISO(block.start_time)
                const end = parseISO(block.end_time)
                const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
                const prev = idx > 0 ? dayBlocks[idx - 1] : null
                const next = idx < dayBlocks.length - 1 ? dayBlocks[idx + 1] : null
                return (
                  <div key={block.id} className="group rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">{info?.title || ''}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                        </p>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        block.status === 'done' ? 'bg-success-50 text-success-500' :
                        block.status === 'skipped' ? 'bg-neutral-100 text-neutral-500' :
                        'bg-primary-50 text-primary-500'
                      }`}>
                        {block.status === 'done' ? t('common.done') : block.status === 'skipped' ? t('common.skipped') : t('common.pending')}
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
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
