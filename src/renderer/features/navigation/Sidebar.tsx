import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Inbox,
  Sun,
  CalendarDays,
  CalendarClock,
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
import { useTranslation } from '../../i18n'

export default memo(function Sidebar() {
  const { t } = useTranslation()

  const navItems = [
    { path: '/inbox', label: t('nav.inbox'), icon: Inbox },
    { path: '/today', label: t('nav.today'), icon: Sun },
    { path: '/upcoming', label: t('nav.upcoming'), icon: CalendarClock },
    { divider: true },
    { path: '/calendar', label: t('nav.calendar'), icon: CalendarDays },
    { path: '/kanban', label: t('nav.kanban'), icon: Columns3 },
    { path: '/timeline', label: t('nav.timeline'), icon: GanttChart },
    { path: '/matrix', label: t('nav.matrix'), icon: Grid2x2 },
    { path: '/report', label: t('nav.report'), icon: BarChart3 },
    { divider: true },
    { path: '/pomodoro', label: t('nav.pomodoro'), icon: Timer },
    { path: '/tags', label: t('nav.tags'), icon: Tag },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ]

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
            return <div key={i} role="separator" className="my-2 h-px bg-neutral-150" />
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
            {t('nav.projects')}
          </span>
          <button className="rounded p-0.5 text-neutral-500 hover:bg-neutral-150 hover:text-neutral-900"
            aria-label={t('nav.projects')}
            title={t('nav.projects')}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
})
