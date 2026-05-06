import { useEffect, useState } from 'react'
import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageHeader } from '../../components/ui/page-header'

export default function UpcomingView() {
  const [blocks, setBlocks] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const start = new Date().toISOString()
      const end = addDays(new Date(), 7).toISOString()
      try {
        const data = await window.electronAPI.schedule.listBetween(start, end)
        setBlocks(data)
      } catch (e) {
        console.error('Failed to load blocks:', e)
      }
    }
    load()
  }, [])

  // Group blocks by date
  const grouped: Record<string, any[]> = {}
  for (const block of blocks) {
    const date = format(parseISO(block.start_time), 'yyyy-MM-dd')
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(block)
  }

  const dateLabel = (dateStr: string) => {
    const d = parseISO(dateStr)
    if (isToday(d)) return '今天'
    if (isTomorrow(d)) return '明天'
    return format(d, 'M月d日 EEEE', { locale: zhCN })
  }

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title="即将" subtitle="未来 7 天的日程" />

      <div className="flex-1 overflow-y-auto space-y-6">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <p className="text-sm">暂无日程</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayBlocks]) => (
            <div key={date}>
              <h3 className="mb-2 text-sm font-semibold text-neutral-700">{dateLabel(date)}</h3>
              <div className="space-y-1.5">
                {dayBlocks.map((block) => (
                  <div key={block.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5">
                    <span className="text-sm font-medium text-neutral-900">
                      {format(parseISO(block.start_time), 'HH:mm')} - {format(parseISO(block.end_time), 'HH:mm')}
                    </span>
                    <span className="flex-1 truncate text-sm text-neutral-600">{block.task_id}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      block.status === 'done' ? 'bg-success-50 text-success-500' : 'bg-primary-50 text-primary-500'
                    }`}>
                      {block.status === 'done' ? '已完成' : '待办'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
