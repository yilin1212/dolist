import { useEffect, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, isSameDay, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageHeader } from '../../components/ui/page-header'
import 'react-day-picker/dist/style.css'

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [blocks, setBlocks] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString()
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59).toISOString()
      try {
        const data = await window.electronAPI.schedule.listBetween(start, end)
        setBlocks(data)
      } catch (e) {
        console.error('Failed to load blocks:', e)
      }
    }
    load()
  }, [selectedDate])

  const dayBlocks = blocks.filter((b) => {
    try {
      return isSameDay(parseISO(b.start_time), selectedDate)
    } catch { return false }
  })

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title="日历" />

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Calendar */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            locale={zhCN}
            modifiers={{
              hasBlock: (date) => blocks.some((b) => {
                try { return isSameDay(parseISO(b.start_time), date) } catch { return false }
              }),
            }}
            modifiersStyles={{
              hasBlock: { backgroundColor: '#E8F2FC', borderRadius: '50%' },
            }}
          />
        </div>

        {/* Day detail */}
        <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-4 overflow-y-auto">
          <h3 className="mb-4 text-lg font-semibold">
            {format(selectedDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}
          </h3>
          {dayBlocks.length === 0 ? (
            <p className="text-sm text-neutral-500">当天暂无日程</p>
          ) : (
            <div className="space-y-2">
              {dayBlocks.map((block) => (
                <div key={block.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-900">
                      {format(parseISO(block.start_time), 'HH:mm')} - {format(parseISO(block.end_time), 'HH:mm')}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      block.status === 'done' ? 'bg-success-50 text-success-500' :
                      block.status === 'skipped' ? 'bg-neutral-100 text-neutral-500' :
                      'bg-primary-50 text-primary-500'
                    }`}>
                      {block.status === 'done' ? '已完成' : block.status === 'skipped' ? '已跳过' : '待办'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
