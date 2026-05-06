import { useState, useEffect } from 'react'
import { format, differenceInMinutes, isToday, isTomorrow, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task } from '../../../../types/models'
import { Button } from '../../../components/ui/button'
import { Checkbox } from '../../../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'

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

function formatSlotLabel(slot: TimeSlot): string {
  const start = parseISO(slot.start)
  const end = parseISO(slot.end)
  const dur = differenceInMinutes(end, start)

  let dateStr: string
  if (isToday(start)) {
    dateStr = '今天'
  } else if (isTomorrow(start)) {
    dateStr = '明天'
  } else {
    dateStr = format(start, 'M月d日 EEEE', { locale: zhCN })
  }

  const h = start.getHours()
  let period: string
  if (h < 12) period = '上午'
  else if (h < 14) period = '中午'
  else if (h < 18) period = '下午'
  else period = '晚上'

  const timeStr = `${format(start, 'HH:mm')}-${format(end, 'HH:mm')}`
  let durStr: string
  if (dur >= 60 && dur % 60 === 0) durStr = `${dur / 60}小时`
  else if (dur >= 60) durStr = `${Math.floor(dur / 60)}h${dur % 60}m`
  else durStr = `${dur}分钟`

  return `${dateStr} ${period}  ${timeStr}  (${durStr})`
}

function formatGroupLabel(slots: TimeSlot[]): string {
  if (slots.length === 1) return formatSlotLabel(slots[0])
  const lines = [`共 ${slots.length} 段，分别是：`]
  for (const s of slots) {
    lines.push(`     • ${formatSlotLabel(s)}`)
  }
  return lines.join('\n')
}

export default function ScheduleDialog({ open, task, onClose, onScheduled }: ScheduleDialogProps) {
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [numPieces, setNumPieces] = useState(2)
  const [candidateGroups, setCandidateGroups] = useState<TimeSlot[][]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    if (!open || !task) return
    const duration = task.estimated_minutes || 30
    if (duration > 90 && !splitEnabled) {
      setSplitEnabled(true)
    }
  }, [open, task])

  useEffect(() => {
    if (!open || !task) return
    let cancelled = false
    const fetchSlots = async () => {
      setLoading(true)
      setCandidateGroups([])
      setSelectedIndex(0)
      try {
        const duration = task.estimated_minutes || 30
        const pieces = splitEnabled ? numPieces : 1
        const result = await window.electronAPI.scheduler.recommendSlots(duration, pieces, 5)
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
  }, [open, task, splitEnabled, numPieces])

  const handleConfirm = async () => {
    if (!task || selectedIndex < 0 || selectedIndex >= candidateGroups.length) return
    setScheduling(true)
    try {
      const slots = candidateGroups[selectedIndex]
      for (const slot of slots) {
        await window.electronAPI.schedule.create({
          task_id: task.id,
          start_time: slot.start,
          end_time: slot.end,
          status: 'pending',
        })
      }
      onScheduled()
    } catch (e) {
      console.error('Failed to schedule:', e)
    } finally {
      setScheduling(false)
    }
  }

  const duration = task?.estimated_minutes || 0
  const hours = Math.floor(duration / 60)
  const mins = duration % 60
  const durationText = hours > 0 ? `${hours}小时${mins > 0 ? mins + '分钟' : ''}` : `${mins}分钟`

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>智能排期</DialogTitle>
          <DialogDescription>为你推荐最佳时间段</DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          {/* Task info */}
          <div className="rounded-lg bg-neutral-50 p-3 text-sm border border-neutral-200">
            <p><span className="font-medium">任务：</span>{task?.title}</p>
            <p><span className="font-medium">预计时长：</span>{durationText}</p>
          </div>

          {/* Split options */}
          {duration > 45 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={splitEnabled}
                  onCheckedChange={(v) => setSplitEnabled(!!v)}
                />
                拆分成多段
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
                  <span className="text-sm text-neutral-600">段</span>
                </div>
              )}
            </div>
          )}

          {/* Candidates */}
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">推荐时间段（请选一个）</p>
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 text-center text-sm text-neutral-500">正在计算最佳时间段...</div>
              ) : candidateGroups.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                  最近几天的工作时间内没有找到合适的空档。<br />
                  你可以试试拆分成更多段，或调整工作时段。
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
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button
            onClick={handleConfirm}
            disabled={candidateGroups.length === 0 || selectedIndex < 0 || scheduling}
          >
            {scheduling ? '排期中...' : '加入日程'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
