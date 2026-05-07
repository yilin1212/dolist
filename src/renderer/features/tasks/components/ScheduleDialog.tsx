import { useState, useEffect } from 'react'
import { format, differenceInMinutes, isToday, isTomorrow, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task } from '../../../../types/models'
import { Button } from '../../../components/ui/button'
import { Checkbox } from '../../../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { useTranslation } from '../../../i18n'
import { useScheduleStore } from '../../schedule/store'
import { useTaskStore } from '../store'

interface TimeSlot {
  start: string
  end: string
}

interface ScheduleDialogProps {
  open: boolean
  task: Task | null
  onClose: () => void
  onScheduled: () => void
}

export default function ScheduleDialog({ open, task, onClose, onScheduled }: ScheduleDialogProps) {
  const { t, locale } = useTranslation()
  const createBlock = useScheduleStore((s) => s.createBlock)
  const updateTaskInStore = useTaskStore((s) => s.updateTask)
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [numPieces, setNumPieces] = useState(2)
  const [candidateGroups, setCandidateGroups] = useState<TimeSlot[][]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [scheduledMinutes, setScheduledMinutes] = useState(0)
  const [extendMinutes, setExtendMinutes] = useState(30)
  const [extendApplied, setExtendApplied] = useState(false)

  const isZh = locale === 'zh-CN'

  function formatSlotLabel(slot: TimeSlot): string {
    const start = parseISO(slot.start)
    const end = parseISO(slot.end)
    const dur = differenceInMinutes(end, start)

    let dateStr: string
    if (isToday(start)) {
      dateStr = t('common.today')
    } else if (isTomorrow(start)) {
      dateStr = t('common.tomorrow')
    } else {
      dateStr = format(start, isZh ? 'M月d日 EEEE' : 'EEE, MMM d', { locale: isZh ? zhCN : undefined })
    }

    const h = start.getHours()
    let period: string
    if (isZh) {
      if (h < 12) period = '上午'
      else if (h < 14) period = '中午'
      else if (h < 18) period = '下午'
      else period = '晚上'
    } else {
      if (h < 12) period = 'AM'
      else if (h < 17) period = 'PM'
      else period = 'EVE'
    }

    const timeStr = `${format(start, 'HH:mm')}-${format(end, 'HH:mm')}`
    let durStr: string
    if (isZh) {
      if (dur >= 60 && dur % 60 === 0) durStr = `${dur / 60}${t('schedule.hours')}`
      else if (dur >= 60) durStr = `${Math.floor(dur / 60)}h${dur % 60}m`
      else durStr = `${dur}${t('schedule.minutes')}`
    } else {
      if (dur >= 60 && dur % 60 === 0) durStr = `${dur / 60}h`
      else if (dur >= 60) durStr = `${Math.floor(dur / 60)}h${dur % 60}m`
      else durStr = `${dur}m`
    }

    return `${dateStr} ${period}  ${timeStr}  (${durStr})`
  }

  function formatGroupLabel(slots: TimeSlot[]): string {
    if (slots.length === 1) return formatSlotLabel(slots[0])
    const header = t('schedule.totalPieces').replace('{n}', String(slots.length))
    const lines = [header]
    for (const s of slots) {
      lines.push(`     • ${formatSlotLabel(s)}`)
    }
    return lines.join('\n')
  }

  // Reset extend state on each open
  useEffect(() => {
    if (open) {
      setExtendApplied(false)
      setExtendMinutes(30)
    }
  }, [open])

  // Refresh scheduled-minutes summary whenever task or open changes.
  useEffect(() => {
    if (!open || !task) return
    let cancelled = false
    const load = async () => {
      try {
        const blocks = await window.electronAPI.schedule.listByTask(task.id)
        if (cancelled) return
        const totalMin = blocks.reduce((sum: number, b: any) => {
          const s = parseISO(b.start_time).getTime()
          const e = parseISO(b.end_time).getTime()
          return sum + Math.max(0, Math.round((e - s) / 60000))
        }, 0)
        setScheduledMinutes(totalMin)
      } catch (e) {
        console.error('Failed to load scheduled blocks for task:', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open, task])

  const estimated = task?.estimated_minutes || 0
  const remaining = Math.max(0, estimated - scheduledMinutes)
  // The duration we want to schedule: either the leftover, or the user-extended amount.
  const targetDuration = extendApplied ? extendMinutes : remaining

  useEffect(() => {
    if (!open || !task) return
    if (targetDuration > 90 && !splitEnabled) {
      setSplitEnabled(true)
    }
    if (targetDuration <= 45 && splitEnabled) {
      setSplitEnabled(false)
    }
  }, [open, task, targetDuration])

  useEffect(() => {
    if (!open || !task) return
    if (targetDuration <= 0) {
      setCandidateGroups([])
      return
    }
    let cancelled = false
    const fetchSlots = async () => {
      setLoading(true)
      setCandidateGroups([])
      setSelectedIndex(0)
      try {
        const pieces = splitEnabled ? numPieces : 1
        const result = await window.electronAPI.scheduler.recommendSlots(targetDuration, pieces, 5)
        if (!cancelled) {
          setCandidateGroups(result || [])
        }
      } catch (e) {
        console.error('Failed to recommend slots:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSlots()
    return () => { cancelled = true }
  }, [open, task, splitEnabled, numPieces, targetDuration])

  const handleConfirm = async () => {
    if (!task || selectedIndex < 0 || selectedIndex >= candidateGroups.length) return
    setScheduling(true)
    try {
      const slots = candidateGroups[selectedIndex]
      for (const slot of slots) {
        await createBlock({
          task_id: task.id,
          start_time: slot.start,
          end_time: slot.end,
          status: 'pending',
        })
      }
      // If we extended the estimate, persist the new total so future re-schedules
      // correctly reflect the user's commitment.
      if (extendApplied && extendMinutes > 0) {
        await updateTaskInStore({
          ...task,
          estimated_minutes: estimated + extendMinutes,
        })
      }
      onScheduled()
    } catch (e) {
      console.error('Failed to schedule:', e)
    } finally {
      setScheduling(false)
    }
  }

  function fmtDuration(min: number): string {
    if (min <= 0) return '0' + (isZh ? t('schedule.minutes') : 'm')
    const hours = Math.floor(min / 60)
    const mins = min % 60
    if (isZh) {
      return hours > 0 ? `${hours}${t('schedule.hours')}${mins > 0 ? mins + t('schedule.minutes') : ''}` : `${mins}${t('schedule.minutes')}`
    }
    return hours > 0 ? `${hours}h${mins > 0 ? mins + 'm' : ''}` : `${mins}m`
  }

  const fullyScheduled = remaining <= 0 && !extendApplied

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('schedule.title')}</DialogTitle>
          <DialogDescription>{t('schedule.description')}</DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          {/* Task info */}
          <div className="rounded-lg bg-neutral-50 p-3 text-sm border border-neutral-200 space-y-0.5">
            <p><span className="font-medium">{t('schedule.task')}：</span>{task?.title}</p>
            <p><span className="font-medium">{t('schedule.duration')}：</span>{fmtDuration(estimated)}</p>
            <p>
              <span className="font-medium">{t('schedule.alreadyScheduled')}：</span>
              <span className="text-primary-700">{fmtDuration(scheduledMinutes)}</span>
              {' '}
              <span className="font-medium">{t('schedule.remaining')}：</span>
              <span className={remaining > 0 ? 'text-warning-600' : 'text-success-600'}>{fmtDuration(remaining)}</span>
            </p>
          </div>

          {/* Already fully scheduled — offer extension */}
          {fullyScheduled && (
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm">
              <p className="font-medium text-warning-700">{t('schedule.fullyScheduled')}</p>
              <p className="mt-1 text-xs text-warning-600">{t('schedule.extendHint')}</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(Math.max(5, Number(e.target.value)))}
                  className="w-20 rounded-md border border-neutral-200 px-2 py-1 text-sm text-center"
                />
                <span className="text-xs text-neutral-600">{t('schedule.minutes')}</span>
                <Button size="sm" onClick={() => setExtendApplied(true)}>
                  {t('schedule.apply')}
                </Button>
              </div>
            </div>
          )}

          {/* Split options — only visible when there's something to schedule */}
          {!fullyScheduled && targetDuration > 45 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={splitEnabled}
                  onCheckedChange={(v) => setSplitEnabled(!!v)}
                />
                {t('schedule.split')}
              </label>
              {splitEnabled && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={numPieces}
                    onChange={(e) => setNumPieces(Math.max(2, Math.min(8, Number(e.target.value))))}
                    className="w-16 rounded-md border border-neutral-200 px-2 py-1 text-sm text-center"
                  />
                  <span className="text-sm text-neutral-600">{t('schedule.pieces')}</span>
                </div>
              )}
            </div>
          )}

          {/* Candidates — hide when fully scheduled and not yet extended */}
          {!fullyScheduled && (
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-700">{t('schedule.recommendLabel')}</p>
              <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <div className="py-8 text-center text-sm text-neutral-500">{t('schedule.calculating')}</div>
                ) : candidateGroups.length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-500">
                    {t('schedule.noSlots')}<br />
                    {t('schedule.noSlotsHint')}
                  </div>
                ) : (
                  candidateGroups.map((group, idx) => (
                    <label
                      key={idx}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selectedIndex === idx
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="slot"
                        checked={selectedIndex === idx}
                        onChange={() => setSelectedIndex(idx)}
                        className="mt-1 accent-primary-500"
                      />
                      <span className="whitespace-pre-line text-sm text-neutral-800">
                        {formatGroupLabel(group)}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            onClick={handleConfirm}
            disabled={fullyScheduled || candidateGroups.length === 0 || selectedIndex < 0 || scheduling}
          >
            {scheduling ? t('schedule.scheduling') : t('schedule.addToSchedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
