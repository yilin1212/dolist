import { useEffect, useState } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageHeader } from '../../components/ui/page-header'

export default function TimelineView() {
  const [blocks, setBlocks] = useState<any[]>([])
  const hours = Array.from({ length: 15 }, (_, i) => i + 8) // 8:00 - 22:00

  useEffect(() => {
    const load = async () => {
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
      try {
        const data = await window.electronAPI.schedule.listBetween(start, end)
        setBlocks(data)
      } catch (e) {
        console.error('Failed to load schedule blocks:', e)
      }
    }
    load()
  }, [])

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title="时间线" subtitle={format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhCN })} />

      <div className="flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} className="flex border-b border-neutral-100" style={{ height: 64 }}>
              <div className="w-16 flex-shrink-0 border-r border-neutral-100 pr-2 pt-1 text-right text-xs text-neutral-500">
                {String(hour).padStart(2, '0')}:00
              </div>
              <div className="flex-1 relative">
                {blocks
                  .filter((b) => {
                    const h = new Date(b.start_time).getHours()
                    return h === hour
                  })
                  .map((block) => {
                    const start = new Date(block.start_time)
                    const end = new Date(block.end_time)
                    const durationMin = (end.getTime() - start.getTime()) / 60000
                    const height = Math.max(24, (durationMin / 60) * 64)
                    return (
                      <div
                        key={block.id}
                        className="absolute left-2 right-2 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs text-primary-700"
                        style={{ height, top: (start.getMinutes() / 60) * 64 }}
                      >
                        <p className="font-medium truncate">{block.task_id}</p>
                        <p className="text-primary-500">
                          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                        </p>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {currentHour >= 8 && currentHour <= 22 && (
            <div
              className="absolute left-16 right-0 z-10 flex items-center"
              style={{ top: (currentHour - 8) * 64 + (currentMinute / 60) * 64 }}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-destructive-500" />
              <div className="flex-1 h-px bg-destructive-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
