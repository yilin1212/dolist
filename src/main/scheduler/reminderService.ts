import { Notification } from 'electron'
import { ScheduleRepo, SettingsRepo, TaskRepo } from '../db/repositories'
import { PomodoroTimer } from '../pomodoro/timer'

const notifiedBlocks = new Map<string, number>()
const activeNotifications: Notification[] = []
const CHECK_INTERVAL = 30_000
const REMINDER_MINUTES = 5
const DEDUP_CUTOFF_MS = 10 * 60_000

function showNotification(options: { title: string; body: string }): void {
  try {
    const n = new Notification(options)
    activeNotifications.push(n)
    n.on('close', () => {
      const idx = activeNotifications.indexOf(n)
      if (idx >= 0) activeNotifications.splice(idx, 1)
    })
    n.show()
  } catch { /* notification may fail silently */ }
}

export function startReminderService(timer: PomodoroTimer): void {
  // Schedule block reminders
  setInterval(() => {
    if (!Notification.isSupported()) return

    const now = new Date()
    const future = new Date(now.getTime() + REMINDER_MINUTES * 60_000)

    let blocks: Awaited<ReturnType<typeof ScheduleRepo.listBetween>>
    try {
      blocks = ScheduleRepo.listBetween(now.toISOString(), future.toISOString())
    } catch {
      return
    }

    // Clean up old entries (>10 min)
    const cutoff = now.getTime() - DEDUP_CUTOFF_MS
    for (const [id, ts] of notifiedBlocks) {
      if (ts < cutoff) notifiedBlocks.delete(id)
    }

    const locale = SettingsRepo.get('locale', 'zh-CN') || 'zh-CN'
    const isEn = locale === 'en'

    for (const block of blocks) {
      if (block.status !== 'pending') continue
      if (notifiedBlocks.has(block.id)) continue

      const startTime = new Date(block.start_time)
      const minutesUntil = Math.max(1, Math.round((startTime.getTime() - now.getTime()) / 60_000))

      let taskTitle = isEn ? 'Task' : '任务'
      if (block.task_id) {
        try {
          const task = TaskRepo.get(block.task_id)
          if (task) taskTitle = task.title
        } catch { /* use default */ }
      }

      showNotification({
        title: isEn ? 'Schedule Reminder' : '日程提醒',
        body: isEn
          ? `"${taskTitle}" starts in ${minutesUntil} min`
          : `"${taskTitle}" 将在 ${minutesUntil} 分钟后开始`,
      })

      notifiedBlocks.set(block.id, now.getTime())
    }
  }, CHECK_INTERVAL)

  // Pomodoro session finish notifications (only for completed, not cancelled)
  timer.on('sessionFinished', (data: { id: string; kind: string }) => {
    if (!Notification.isSupported()) return

    const locale = SettingsRepo.get('locale', 'zh-CN') || 'zh-CN'
    const isEn = locale === 'en'
    const isFocus = data.kind === 'focus'
    showNotification({
      title: isEn ? (isFocus ? 'Pomodoro Complete' : 'Break Over') : (isFocus ? '番茄钟完成' : '休息结束'),
      body: isEn
        ? (isFocus ? 'Focus session done! Time for a break.' : 'Break over, time to focus!')
        : (isFocus ? '专注时间结束！休息一下吧' : '休息结束，继续专注吧'),
    })
  })
}
