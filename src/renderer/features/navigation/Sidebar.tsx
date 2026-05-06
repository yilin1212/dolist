import { NavLink } from 'react-router-dom'
import {
  Inbox,
  Sun,
  CalendarDays,
  LayoutGrid,
  Columns3,
  GanttChart,
  Grid2x2,
  BarChart3,
  Timer,
  Tag,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { path: '/inbox', label: '收件箱', icon: Inbox },
  { path: '/today', label: '今天', icon: Sun },
  { path: '/upcoming', label: '即将', icon: CalendarDays },
  { divider: true },
  { path: '/calendar', label: '日历', icon: CalendarDays },
  { path: '/kanban', label: '看板', icon: Columns3 },
  { path: '/timeline', label: '时间线', icon: GanttChart },
  { path: '/matrix', label: '四象限', icon: Grid2x2 },
  { path: '/report', label: '报告', icon: BarChart3 },
  { divider: true },
  { path: '/pomodoro', label: '番茄钟', icon: Timer },
  { path: '/tags', label: '标签', icon: Tag },
  { path: '/settings', label: '设置', icon: Settings },
]

export default function Sidebar() {
  return (
    <nav className="flex h-full flex-col overflow-y-auto px-2 py-3">
      {/* App title */}
      <div className="mb-4 px-3">
        <h1 className="text-sm font-bold tracking-tight text-neutral-900">DoList</h1>
      </div>

      {/* Navigation items */}
      <div className="flex flex-col gap-0.5">
        {navItems.map((item, i) => {
          if ('divider' in item && item.divider) {
            return <div key={i} className="my-2 h-px bg-neutral-150" />
          }
          if (!('path' in item)) return null
          const Icon = item.icon!
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-neutral-150 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-150 hover:text-neutral-900'
                )
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>

      {/* Projects section placeholder */}
      <div className="mt-auto border-t border-neutral-150 pt-3">
        <div className="flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            项目
          </span>
          <button className="rounded p-0.5 text-neutral-500 hover:bg-neutral-150 hover:text-neutral-900">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}
