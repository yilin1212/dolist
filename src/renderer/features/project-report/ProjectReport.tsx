import { useEffect, useState } from 'react'
import { parseISO } from 'date-fns'
import { CheckCircle, Timer, Coffee, BarChart3 } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { SegmentedControl } from '../../components/ui/segmented-control'
import { Card, CardContent } from '../../components/ui/card'
import { useTranslation } from '../../i18n'
import type { Task } from '../../../../types/models'
import type { PomodoroSession } from '../../../../types/models'

export default function ProjectReport() {
  const { t } = useTranslation()
  const [range, setRange] = useState('today')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    completedTasks: 0,
    focusMinutes: 0,
    completedPomodoros: 0,
    avgMinutesPerPomodoro: 0,
  })

  const ranges = [
    { value: 'today', label: t('report.today') },
    { value: 'week', label: t('report.week') },
    { value: 'month', label: t('report.month') },
  ]

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const now = new Date()
        let start: Date
        if (range === 'today') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (range === 'week') {
          start = new Date(now.getTime() - 7 * 86400000)
        } else {
          start = new Date(now.getTime() - 30 * 86400000)
        }

        const tasks: Task[] = await window.electronAPI.tasks.list({ status: 'done' })
        const completedInRange = tasks.filter((task) => {
          if (!task.completed_at) return false
          return parseISO(task.completed_at) >= start
        })

        // Query pomodoro_sessions table for historical data
        const sessions: PomodoroSession[] = await window.electronAPI.pomodoro.listBetween(start.toISOString(), now.toISOString())
        const completedSessions = sessions.filter((s) => s.status === 'completed' && s.session_kind === 'focus')
        const totalFocusMinutes = completedSessions.reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0)

        setStats({
          completedTasks: completedInRange.length,
          focusMinutes: totalFocusMinutes,
          completedPomodoros: completedSessions.length,
          avgMinutesPerPomodoro: completedSessions.length > 0
            ? Math.round(totalFocusMinutes / completedSessions.length)
            : 0,
        })
      } catch (e) {
        console.error('Failed to load stats:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [range])

  const statCards = [
    { label: t('report.completedTasks'), value: stats.completedTasks, icon: CheckCircle, color: 'text-success-500' },
    { label: t('report.focusMinutes'), value: stats.focusMinutes, icon: Timer, color: 'text-primary-500' },
    { label: t('report.completedPomodoros'), value: stats.completedPomodoros, icon: Coffee, color: 'text-warning-500' },
    { label: t('report.avgMinutes'), value: stats.avgMinutesPerPomodoro, icon: BarChart3, color: 'text-neutral-600' },
  ]

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between mb-6">
        <PageHeader title={t('report.title')} subtitle={t('report.subtitle')} className="mb-0" />
        <SegmentedControl options={ranges} value={range} onChange={setRange} />
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {loading ? (
          <div className="col-span-4 py-20 text-center text-neutral-500">{t('common.loading')}</div>
        ) : statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={stat.color} />
                  <span className="text-xs text-neutral-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Placeholder for charts */}
      <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-center text-sm text-neutral-500">{t('report.chartsPlaceholder')}</p>
      </div>
    </div>
  )
}
