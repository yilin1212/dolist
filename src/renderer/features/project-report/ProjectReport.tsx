import { useEffect, useState } from 'react'
import { CheckCircle, Timer, Coffee, BarChart3 } from 'lucide-react'
import { PageHeader } from '../../components/ui/page-header'
import { SegmentedControl } from '../../components/ui/segmented-control'
import { Card, CardContent } from '../../components/ui/card'

const ranges = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '7天' },
  { value: 'month', label: '30天' },
]

export default function ProjectReport() {
  const [range, setRange] = useState('today')
  const [stats, setStats] = useState({
    completedTasks: 0,
    focusMinutes: 0,
    completedPomodoros: 0,
    avgMinutesPerPomodoro: 0,
  })

  useEffect(() => {
    const load = async () => {
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

        const tasks = await window.electronAPI.tasks.list({ status: 'done' })
        const completedInRange = tasks.filter((t: any) => {
          if (!t.completed_at) return false
          return new Date(t.completed_at) >= start
        })

        const pomodoros = await window.electronAPI.pomodoro.getState()
        // Simplified stats - in production you'd query pomodoro_sessions table
        setStats({
          completedTasks: completedInRange.length,
          focusMinutes: completedInRange.reduce((sum: number, t: any) => sum + (t.actual_minutes || 0), 0),
          completedPomodoros: pomodoros.completedFocusCount || 0,
          avgMinutesPerPomodoro: pomodoros.completedFocusCount > 0
            ? Math.round(completedInRange.reduce((sum: number, t: any) => sum + (t.actual_minutes || 0), 0) / pomodoros.completedFocusCount)
            : 0,
        })
      } catch (e) {
        console.error('Failed to load stats:', e)
      }
    }
    load()
  }, [range])

  const statCards = [
    { label: '完成任务', value: stats.completedTasks, icon: CheckCircle, color: 'text-success-500' },
    { label: '专注分钟', value: stats.focusMinutes, icon: Timer, color: 'text-primary-500' },
    { label: '完成番茄', value: stats.completedPomodoros, icon: Coffee, color: 'text-warning-500' },
    { label: '平均分钟/番茄', value: stats.avgMinutesPerPomodoro, icon: BarChart3, color: 'text-neutral-600' },
  ]

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="统计报告" subtitle="查看你的工作效率" className="mb-0" />
        <SegmentedControl options={ranges} value={range} onChange={setRange} />
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {statCards.map((stat) => {
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
        <p className="text-center text-sm text-neutral-500">图表功能开发中...</p>
      </div>
    </div>
  )
}
