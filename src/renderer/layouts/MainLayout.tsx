import { useEffect, useMemo } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Pause, Play, Square, Minimize2 } from 'lucide-react'
import Sidebar from '../features/navigation/Sidebar'
import WindowControls from './WindowControls'
import { usePomodoroStore } from '../features/pomodoro/store'
import { useTaskStore } from '../features/tasks/store'
import { ProgressRing } from '../components/ui/progress-ring'
import { useTranslation } from '../i18n'

export default function MainLayout() {
  // Keep a global subscription to pomodoro events so other views (Inbox,
  // Kanban, etc.) reflect timer state changes even when the Pomodoro panel
  // is not mounted.
  useEffect(() => {
    usePomodoroStore.getState().fetchState()
    const unsub = usePomodoroStore.getState().subscribe()
    return unsub
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 font-sans text-neutral-900">
      {/* Custom title bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-8 items-center justify-between bg-neutral-50 pl-48" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span className="text-xs text-neutral-500">DoList</span>
        <WindowControls />
      </div>

      {/* Sidebar */}
      <aside className="mt-8 w-56 flex-shrink-0 border-r border-neutral-200 bg-neutral-50">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="mt-8 flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom-left pomodoro indicator (visible whenever timer is running) */}
      <PomodoroDock />
    </div>
  )
}

function PomodoroDock() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state, kind, remainingSec, totalSec, taskId, pause, resume, stop } = usePomodoroStore()
  const { tasks } = useTaskStore()

  const isActive = state !== 'idle'

  const taskTitle = useMemo(() => {
    if (!taskId) return null
    return tasks.find((t) => t.id === taskId)?.title || null
  }, [taskId, tasks])

  if (!isActive) return null

  const progress = totalSec > 0 ? 1 - remainingSec / totalSec : 0
  const minutes = Math.floor(remainingSec / 60)
  const seconds = remainingSec % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const kindLabel = kind === 'focus' ? t('pomodoro.focus') : kind === 'short_break' ? t('pomodoro.shortBreak') : t('pomodoro.longBreak')
  const ringColor = kind === 'focus' ? '#2383E2' : '#0F9D58'

  return (
    <div className="fixed bottom-4 left-[240px] z-40 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      <button
        onClick={() => navigate('/pomodoro')}
        className="flex items-center gap-2 rounded-md text-left hover:bg-neutral-50 px-1 py-0.5"
        title={t('pomodoro.expand')}
      >
        <ProgressRing progress={progress} size={32} strokeWidth={3} color={ringColor} />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tabular-nums text-neutral-900">{formatted}</span>
          <span className="text-[10px] text-neutral-500">{kindLabel}{taskTitle ? ` · ${taskTitle}` : ''}</span>
        </div>
      </button>
      <div className="flex items-center gap-0.5 border-l border-neutral-200 pl-1.5">
        {(state === 'focusing' || state === 'break') && (
          <button
            onClick={() => pause()}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label={t('pomodoro.pause')}
            title={t('pomodoro.pause')}
          >
            <Pause size={14} />
          </button>
        )}
        {state === 'paused' && (
          <button
            onClick={() => resume()}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label={t('pomodoro.resume')}
            title={t('pomodoro.resume')}
          >
            <Play size={14} />
          </button>
        )}
        <button
          onClick={() => stop().catch(() => {})}
          className="rounded p-1 text-neutral-500 hover:bg-destructive-50 hover:text-destructive-600"
          aria-label={t('pomodoro.stop')}
          title={t('pomodoro.stop')}
        >
          <Square size={14} />
        </button>
        <button
          onClick={() => window.electronAPI.pomodoro.showMini().catch(() => {})}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          aria-label={t('pomodoro.mini')}
          title={t('pomodoro.mini')}
        >
          <Minimize2 size={14} />
        </button>
      </div>
    </div>
  )
}
