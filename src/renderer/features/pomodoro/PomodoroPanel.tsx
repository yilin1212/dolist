import { useEffect, useState } from 'react'
import { Play, Pause, Square, Minus, Plus, Minimize2 } from 'lucide-react'
import { usePomodoroStore } from './store'
import { ProgressRing } from '../../components/ui/progress-ring'
import { Button } from '../../components/ui/button'

export default function PomodoroPanel() {
  const { state, remainingSec, totalSec, kind, completedFocusCount, fetchState, startFocus, pause, resume, stop, subscribe } = usePomodoroStore()
  const [focusMinutes, setFocusMinutes] = useState(25)
  const isActive = state !== 'idle'

  useEffect(() => {
    fetchState()
    const unsub = subscribe()
    return unsub
  }, [])

  const progress = totalSec > 0 ? 1 - remainingSec / totalSec : 0
  const minutes = Math.floor(remainingSec / 60)
  const seconds = remainingSec % 60

  const formatTime = () => `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const kindLabel = kind === 'focus' ? '专注' : kind === 'short_break' ? '短休息' : '长休息'

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-neutral-900">番茄钟</h1>

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

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        {!isActive ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <button
                onClick={() => setFocusMinutes(Math.max(1, focusMinutes - 5))}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-150"
              >
                <Minus size={14} />
              </button>
              <span className="w-12 text-center text-sm font-medium">{focusMinutes}分</span>
              <button
                onClick={() => setFocusMinutes(Math.min(120, focusMinutes + 5))}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-150"
              >
                <Plus size={14} />
              </button>
            </div>
            <Button onClick={() => startFocus(focusMinutes)}>
              <Play className="mr-1.5 h-4 w-4" />
              开始专注
            </Button>
          </>
        ) : (
          <>
            {state === 'focusing' || state === 'break' ? (
              <Button variant="outline" onClick={pause}>
                <Pause className="mr-1.5 h-4 w-4" />
                暂停
              </Button>
            ) : (
              <Button onClick={resume}>
                <Play className="mr-1.5 h-4 w-4" />
                继续
              </Button>
            )}
            <Button variant="destructive" onClick={stop}>
              <Square className="mr-1.5 h-4 w-4" />
              停止
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.electronAPI.pomodoro.showMini()}
              title="缩小为迷你窗口"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Today summary */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
        <p className="text-sm text-neutral-600">今日完成</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">{completedFocusCount}</p>
        <p className="text-xs text-neutral-500">个番茄钟</p>
      </div>
    </div>
  )
}
