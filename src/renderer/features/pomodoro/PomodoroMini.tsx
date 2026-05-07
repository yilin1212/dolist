import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Square, Maximize2 } from 'lucide-react'
import { usePomodoroStore } from './store'
import { ProgressRing } from '../../components/ui/progress-ring'
import { useTranslation } from '../../i18n'

export default function PomodoroMini() {
  const { t } = useTranslation()
  const { state, remainingSec, totalSec, kind, fetchState, pause, resume, stop, subscribe } = usePomodoroStore()
  const [size, setSize] = useState({ w: window.innerWidth || 260, h: window.innerHeight || 130 })
  const resizingRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null)

  useEffect(() => {
    // Ensure the transparent BrowserWindow shows no white background.
    const prevBodyBg = document.body.style.background
    const prevHtmlBg = document.documentElement.style.background
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'

    fetchState()
    const unsub = subscribe()

    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)

    return () => {
      unsub()
      window.removeEventListener('resize', onResize)
      document.body.style.background = prevBodyBg
      document.documentElement.style.background = prevHtmlBg
    }
  }, [])

  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizingRef.current = {
      startX: e.screenX,
      startY: e.screenY,
      startW: window.innerWidth,
      startH: window.innerHeight,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizingRef.current
    if (!r) return
    const newW = r.startW + (e.screenX - r.startX)
    const newH = r.startH + (e.screenY - r.startY)
    window.electronAPI.pomodoro.setMiniBounds(newW, newH)
  }

  const onResizeEnd = (e: React.PointerEvent) => {
    if (!resizingRef.current) return
    resizingRef.current = null
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch { /* ignore */ }
  }

  const progress = totalSec > 0 ? 1 - remainingSec / totalSec : 0
  const minutes = Math.floor(remainingSec / 60)
  const seconds = remainingSec % 60
  const formatTime = () => `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const kindLabel = kind === 'focus' ? t('pomodoro.focus') : kind === 'short_break' ? t('pomodoro.shortBreak') : t('pomodoro.longBreak')
  const isActive = state !== 'idle'

  // Scale the timer ring with the available height to give a sense of "fitting"
  // when resized.
  const ringSize = Math.max(36, Math.min(80, size.h - 40))
  const fontSize = Math.max(16, Math.min(32, size.h / 4))

  const handleExpand = async () => {
    await window.electronAPI.pomodoro.hideMini()
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden rounded-xl bg-neutral-900 text-white flex items-center justify-between px-4"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Timer */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ProgressRing
          progress={progress}
          size={ringSize}
          strokeWidth={Math.max(3, ringSize / 12)}
          color={kind === 'focus' ? '#2383E2' : '#0F9D58'}
        />
        <div className="flex flex-col min-w-0">
          {isActive ? (
            <>
              <span className="font-bold tabular-nums leading-tight" style={{ fontSize }}>{formatTime()}</span>
              <span className="text-[10px] text-neutral-400 truncate">{kindLabel}</span>
            </>
          ) : (
            <span className="text-sm text-neutral-400">{t('pomodoro.noActive')}</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {isActive && (state === 'focusing' || state === 'break') && (
          <button
            onClick={pause}
            className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
            title={t('pomodoro.pause')}
          >
            <Pause size={14} />
          </button>
        )}
        {isActive && state === 'paused' && (
          <button
            onClick={resume}
            className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
            title={t('pomodoro.resume')}
          >
            <Play size={14} />
          </button>
        )}
        {isActive && (
          <button
            onClick={stop}
            className="rounded p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition-colors"
            title={t('pomodoro.stop')}
          >
            <Square size={14} />
          </button>
        )}
        <button
          onClick={handleExpand}
          className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          title={t('pomodoro.expand') || t('common.close')}
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Resize handle (bottom-right corner) */}
      <div
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
        className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        title="Drag to resize"
      >
        <svg viewBox="0 0 10 10" className="h-full w-full text-neutral-500">
          <path d="M9 1 L1 9 M9 4 L4 9 M9 7 L7 9" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </div>
    </div>
  )
}
