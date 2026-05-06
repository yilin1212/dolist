import { Notification } from 'electron'
import { ScheduleRepo, TaskRepo } from '../db/repositories'
import { PomodoroTimer } from '../pomodoro/timer'

const notifiedBlocks = new Map<string, number>()
const CHECK_INTERVAL = 30_000
const REMINDER_MINUTES = 5

export function startReminderService(timer: PomodoroTimer): void {
  // Schedule block reminders
  setInterval(() => {
    if (!Notification.isSupported()) return

    const now = new Date()
    const future = new Date(now.getTime() + REMINDER_MINUTES * 60_000)

    let blocks: any[]
    try {
      blocks = ScheduleRepo.listBetween(now.toISOString(), future.toISOString())
    } catch {
      return
    }

    // Clean up old entries (>10 min)
    const cutoff = now.getTime() - 10 * 60_000
    for (const [id, ts] of notifiedBlocks) {
      if (ts < cutoff) notifiedBlocks.delete(id)
    }

    for (const block of blocks) {
      if (block.status !== 'pending') continue
      if (notifiedBlocks.has(block.id)) continue

      const startTime = new Date(block.start_time)
      const minutesUntil = Math.max(1, Math.round((startTime.getTime() - now.getTime()) / 60_000))

      let taskTitle = '任务'
      if (block.task_id) {
        try {
          const task = TaskRepo.get(block.task_id)
          if (task) taskTitle = task.title
        } catch { /* use default */ }
      }

      try {
        new Notification({
          title: '日程提醒',
          body: `"${taskTitle}" 将在 ${minutesUntil} 分钟后开始`,
        }).show()
      } catch { /* notification may fail silently */ }

      notifiedBlocks.set(block.id, now.getTime())
    }
  }, CHECK_INTERVAL)

  // Pomodoro session finish notifications
  timer.on('sessionFinished', (data: { id: string; kind: string }) => {
    if (!Notification.isSupported()) return

    const isFocus = data.kind === 'focus'
    try {
      new Notification({
        title: isFocus ? '番茄钟完成' : '休息结束',
        body: isFocus ? '专注时间结束！休息一下吧' : '休息结束，继续专注吧',
      }).show()
    } catch { /* notification may fail silently */ }
  })
}
