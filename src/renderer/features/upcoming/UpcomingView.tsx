import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, isToday, isTomorrow, addDays, differenceInMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Timer, ChevronUp, ChevronDown, X } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { useTranslation } from '../../i18n'
import { useTaskStore } from '../tasks/store'
import { useScheduleStore } from '../schedule/store'
import { usePomodoroStore } from '../pomodoro/store'
import type { ScheduleBlock } from '../../../../types/models'

export default function UpcomingView() {
  const { t, locale } = useTranslation()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { tasks, fetchTasks } = useTaskStore()
  const { blocks, loading: scheduleLoading, loadRange, deleteBlock, refresh } = useScheduleStore()
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
  const validBlocks = useMemo(() => blocks.filter((b) => taskMap[b.task_id]), [blocks, taskMap])

  // Group blocks by date (use a Map to preserve sort order from the SQL query)
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleBlock[]>()
    for (const block of validBlocks) {
      const date = format(parseISO(block.start_time), 'yyyy-MM-dd')
      const arr = map.get(date) || []
      arr.push(block)
      map.set(date, arr)
    }
    return map
  }, [validBlocks])

  const dateLabel = (dateStr: string) => {
    const d = parseISO(dateStr)
    if (isToday(d)) return t('common.today')
    if (isTomorrow(d)) return t('common.tomorrow')
    return format(d, locale === 'zh-CN' ? 'M月d日 EEEE' : 'EEE, MMM d', { locale: locale === 'zh-CN' ? zhCN : undefined })
  }

  const [swapping, setSwapping] = useState(false)
  const swapBlocks = async (a: ScheduleBlock, b: ScheduleBlock) => {
    if (swapping) return
    setSwapping(true)
    try {
      await window.electronAPI.schedule.update({ ...a, start_time: b.start_time, end_time: b.end_time })
      await window.electronAPI.schedule.update({ ...b, start_time: a.start_time, end_time: a.end_time })
      await refresh()
    } catch (e) {
      console.error('Failed to swap blocks:', e)
    } finally {
      setSwapping(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    try {
      await deleteBlock(confirmDeleteId)
    } catch (e) {
      console.error('Failed to delete block:', e)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title={t('upcoming.title')} subtitle={t('upcoming.subtitle')} />

      <div className="flex-1 overflow-y-auto space-y-6">
        {scheduleLoading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500">{t('common.loading')}</div>
        ) : grouped.size === 0 ? (
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
                        block.status === 'done' ? 'bg-success-50 text-success-500'
                          : block.status === 'skipped' ? 'bg-neutral-100 text-neutral-500'
                          : 'bg-primary-50 text-primary-500'
                      }`}>
                        {block.status === 'done' ? t('common.done')
                          : block.status === 'skipped' ? t('common.skipped')
                          : t('common.pending')}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => prev && swapBlocks(block, prev)}
                          disabled={!prev}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={t('schedule.moveUp')}
                          title={t('schedule.moveUp')}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => next && swapBlocks(block, next)}
                          disabled={!next}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={t('schedule.moveDown')}
                          title={t('schedule.moveDown')}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => startFocus(minutes, block.task_id, block.id).catch(() => {})}
                          className="rounded p-1 text-neutral-400 hover:bg-primary-50 hover:text-primary-600"
                          aria-label={t('common.startPomodoro')}
                          title={t('common.startPomodoro')}
                        >
                          <Timer size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(block.id)}
                          className="rounded p-1 text-neutral-400 hover:bg-destructive-50 hover:text-destructive-500"
                          aria-label={t('common.delete')}
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

      <Dialog open={!!confirmDeleteId} onOpenChange={(v) => !v && setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{t('common.delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">{t('schedule.deleteBlockConfirm')}</p>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
