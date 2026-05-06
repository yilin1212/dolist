import { create } from 'zustand'

interface PomodoroState {
  state: string
  remainingSec: number
  totalSec: number
  kind: string
  taskId: string | null
  completedFocusCount: number

  fetchState: () => Promise<void>
  startFocus: (minutes: number, taskId?: string, blockId?: string) => Promise<void>
  startBreak: (kind?: string) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  subscribe: () => () => void
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  state: 'idle',
  remainingSec: 0,
  totalSec: 0,
  kind: 'focus',
  taskId: null,
  completedFocusCount: 0,

  fetchState: async () => {
    try {
      const s = await window.electronAPI.pomodoro.getState()
      set({
        state: s.state,
        remainingSec: s.remaining,
        totalSec: s.total,
        kind: s.kind,
        taskId: s.taskId,
        completedFocusCount: s.completedFocusCount,
      })
    } catch (e) {
      console.error('Failed to fetch pomodoro state:', e)
    }
  },

  startFocus: async (minutes, taskId, blockId) => {
    await window.electronAPI.pomodoro.startFocus(minutes, taskId, blockId)
    await get().fetchState()
  },

  startBreak: async (kind = 'short_break') => {
    await window.electronAPI.pomodoro.startBreak(kind)
    await get().fetchState()
  },

  pause: async () => {
    await window.electronAPI.pomodoro.pause()
  },

  resume: async () => {
    await window.electronAPI.pomodoro.resume()
  },

  stop: async () => {
    await window.electronAPI.pomodoro.stop()
    await get().fetchState()
  },

  subscribe: () => {
    const unsubTick = window.electronAPI.pomodoro.onTick((data) => {
      set({ remainingSec: data.remaining, totalSec: data.total })
    })
    const unsubState = window.electronAPI.pomodoro.onStateChanged((state) => {
      set({ state })
      get().fetchState()
    })
    return () => { unsubTick(); unsubState() }
  },
}))
