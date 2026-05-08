import { useEffect, useMemo, useState } from 'react'
import { Play, Pause, Square, Minus, Plus, Minimize2 } from 'lucide-react'
import { usePomodoroStore } from './store'
import { useTaskStore } from '../tasks/store'
import { ProgressRing } from '../../components/ui/progress-ring'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { useTranslation } from '../../i18n'

export default function PomodoroPanel() {
  const { t } = useTranslation()
  const { state, remainingSec, totalSec, kind, taskId, completedFocusCount, fetchState, startFocus, pause, resume, stop, subscribe } = usePomodoroStore()
  const { tasks, fetchTasks } = useTaskStore()
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const isActive = state !== 'idle'

  useEffect(() => {
    fetchState()
    fetchTasks()
    const unsub = subscribe()
    window.electronAPI.settings.getInt('pomodoro_focus_min', 25).then((min) => {
      if (min > 0) setFocusMinutes(min)
    }).catch(() => {})
    return unsub
  }, [])

  // Tasks available for selection: pending or doing, never done/cancelled
  const eligibleTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled'),
    [tasks]
  )

  const activeTaskTitle = useMemo(() => {
    if (!taskId) return null
    return tasks.find((t) => t.id === taskId)?.title || null
  }, [taskId, tasks])

  const progress = totalSec > 0 ? 1 - remainingSec / totalSec : 0
  const minutes = Math.floor(remainingSec / 60)
  const seconds = remainingSec % 60

  const formatTime = () => `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const kindLabel = kind === 'focus' ? t('pomodoro.focus') : kind === 'short_break' ? t('pomodoro.shortBreak') : t('pomodoro.longBreak')

  const handleStart = async () => {
    try {
      await startFocus(focusMinutes, selectedTaskId || undefined)
    } catch (e) {
      console.error('Failed to start focus:', e)
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mb-8 flex w-full items-start justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('pomodoro.title')}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.electronAPI.pomodoro.showMini().catch(() => {})}
          aria-label={t('pomodoro.mini')}
          title={t('pomodoro.mini')}
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Timer ring */}
      <div className="relative mb-6">
        <ProgressRing
          progress={progress}
          size={200}
          strokeWidth={8}
          color={kind === 'focus' ? '#2383E2' : '#0F9D58'}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums text-neutral-900">{formatTime()}</span>
          <span className="mt-1 text-sm text-neutral-500">{kindLabel}</span>
        </div>
      </div>

      {/* Active task indicator */}
      {isActive && activeTaskTitle && (
        <div className="mb-4 max-w-xs truncate rounded-lg bg-primary-50 px-3 py-1.5 text-sm text-primary-700">
          {activeTaskTitle}
        </div>
      )}

      {/* Task selector (idle only) */}
      {!isActive && (
        <div className="mb-4 w-full max-w-sm">
          <label className="mb-1.5 block text-xs font-medium text-neutral-600">
            {t('pomodoro.selectTask')}
          </label>
          <Select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
          >
            <option value="">{t('pomodoro.noTask')}</option>
            {eligibleTasks.map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </Select>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        {!isActive ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <button
                onClick={() => setFocusMinutes(Math.max(1, focusMinutes - 5))}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-150"
                aria-label={t('pomodoro.decreaseMinutes')}
              >
                <Minus size={14} />
              </button>
              <span className="w-12 text-center text-sm font-medium">{focusMinutes}{t('pomodoro.minutes')}</span>
              <button
                onClick={() => setFocusMinutes(Math.min(120, focusMinutes + 5))}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-150"
                aria-label={t('pomodoro.increaseMinutes')}
              >
                <Plus size={14} />
              </button>
            </div>
            <Button onClick={handleStart}>
              <Play className="mr-1.5 h-4 w-4" />
              {t('pomodoro.startFocus')}
            </Button>
          </>
        ) : (
          <>
            {state === 'focusing' || state === 'break' ? (
              <Button variant="outline" onClick={() => pause()}>
                <Pause className="mr-1.5 h-4 w-4" />
                {t('pomodoro.pause')}
              </Button>
            ) : (
              <Button onClick={() => resume()}>
                <Play className="mr-1.5 h-4 w-4" />
                {t('pomodoro.resume')}
              </Button>
            )}
            <Button variant="destructive" onClick={() => stop().catch(() => {})}>
              <Square className="mr-1.5 h-4 w-4" />
              {t('pomodoro.stop')}
            </Button>
          </>
        )}
      </div>

      {/* Today summary */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
        <p className="text-sm text-neutral-600">{t('pomodoro.completed')}</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">{completedFocusCount}</p>
        <p className="text-xs text-neutral-500">{t('pomodoro.pomodoros')}</p>
      </div>
    </div>
  )
}
