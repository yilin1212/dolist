import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Timer, X } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { useTranslation } from '../../i18n'
import { useTaskStore } from '../tasks/store'
import { useScheduleStore } from '../schedule/store'
import { usePomodoroStore } from '../pomodoro/store'

export default function TimelineView() {
  const { t, locale } = useTranslation()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { tasks, fetchTasks } = useTaskStore()
  const { blocks, loading: scheduleLoading, loadRange, deleteBlock } = useScheduleStore()
  const startFocus = usePomodoroStore((s) => s.startFocus)
  const [startHour, setStartHour] = useState(9)
  const [endHour, setEndHour] = useState(22)
  const hours = useMemo(() => Array.from({ length: endHour - startHour }, (_, i) => i + startHour), [startHour, endHour])

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
    window.electronAPI.settings.getInt('workday_start_hour', 9).then(setStartHour).catch(() => {})
    window.electronAPI.settings.getInt('workday_end_hour', 22).then(setEndHour).catch(() => {})
  }, [])

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Filter out blocks whose task has been deleted
  const validBlocks = blocks.filter((b) => taskMap[b.task_id])

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
      <PageHeader title={t('timeline.title')} subtitle={format(new Date(), locale === 'zh-CN' ? 'yyyy年M月d日 EEEE' : 'EEEE, MMM d, yyyy', { locale: locale === 'zh-CN' ? zhCN : undefined })} />

      <div className="flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
        {scheduleLoading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500">{t('common.loading')}</div>
        ) : (
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="flex border-b border-neutral-100" style={{ height: 64 }}>
              <div className="w-16 flex-shrink-0 border-r border-neutral-100 pr-2 pt-1 text-right text-xs text-neutral-500">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="flex-1" />
            </div>
          ))}

          {/* Block overlay - positioned over the entire timeline area */}
          <div className="absolute left-16 right-0 top-0" style={{ height: hours.length * 64 }}>
            {validBlocks.map((block) => {
              const start = parseISO(block.start_time)
              const end = parseISO(block.end_time)
              const durationMin = (end.getTime() - start.getTime()) / 60000
              const topOffset = (start.getHours() - startHour) * 64 + (start.getMinutes() / 60) * 64
              const height = Math.max(24, (durationMin / 60) * 64)
              if (topOffset < 0) return null
              return (
                <div
                  key={block.id}
                  className="group absolute left-2 right-2 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs text-primary-700 z-[1]"
                  style={{ top: topOffset, height }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="flex-1 truncate font-medium">{taskMap[block.task_id]}</p>
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => startFocus(Math.max(1, Math.round(durationMin)), block.task_id, block.id).catch(() => {})}
                        className="rounded p-0.5 hover:bg-primary-100"
                        aria-label={t('common.startPomodoro')}
                        title={t('common.startPomodoro')}
                      >
                        <Timer size={12} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(block.id)}
                        className="rounded p-0.5 text-primary-700 hover:bg-destructive-100 hover:text-destructive-600"
                        aria-label={t('common.delete')}
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

          {/* Current time indicator */}
          {currentHour >= startHour && currentHour < endHour && (
            <div
              className="absolute left-16 right-0 z-10 flex items-center"
              style={{ top: (currentHour - startHour) * 64 + (currentMinute / 60) * 64 }}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-destructive-500" />
              <div className="flex-1 h-px bg-destructive-500" />
            </div>
          )}
        </div>
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
