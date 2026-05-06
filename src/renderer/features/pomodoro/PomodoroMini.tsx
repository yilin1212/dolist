import { useEffect } from 'react'
import { Pause, Play, Square, X } from 'lucide-react'
import { usePomodoroStore } from './store'
import { ProgressRing } from '../../components/ui/progress-ring'

export default function PomodoroMini() {
  const { state, remainingSec, totalSec, kind, fetchState, pause, resume, stop, subscribe } = usePomodoroStore()

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
  const isActive = state !== 'idle'

  const handleClose = async () => {
    await window.electronAPI.pomodoro.hideMini()
  }

  if (!isActive) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-neutral-900 text-white rounded-xl"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-sm text-neutral-400">无进行中的番茄钟</span>
      </div>
    )
  }

  return (
    <div
      className="flex h-screen items-center justify-between px-4 bg-neutral-900 text-white rounded-xl overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Timer */}
      <div className="flex items-center gap-3">
        <ProgressRing
          progress={progress}
          size={44}
          strokeWidth={4}
          color={kind === 'focus' ? '#2383E2' : '#0F9D58'}
        />
        <div className="flex flex-col">
          <span className="text-xl font-bold tabular-nums leading-tight">{formatTime()}</span>
          <span className="text-[10px] text-neutral-400">{kindLabel}</span>
        </div>
      </div>

      {/* Controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {state === 'focusing' || state === 'break' ? (
          <button
            onClick={pause}
            className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
            title="暂停"
          >
            <Pause size={14} />
          </button>
        ) : (
          <button
            onClick={resume}
            className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
            title="继续"
          >
            <Play size={14} />
          </button>
        )}
        <button
          onClick={stop}
          className="rounded p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition-colors"
          title="停止"
        >
          <Square size={14} />
        </button>
        <button
          onClick={handleClose}
          className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          title="关闭迷你窗口"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
