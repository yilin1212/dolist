import { create } from 'zustand'
import { useTaskStore } from '../tasks/store'

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

function notifyTasksChanged(): void {
  // Pull a fresh task list (main process may have moved status to/from 'doing'),
  // and let any other store that cares (e.g. ScheduleStore) react too.
  useTaskStore.getState().fetchTasks()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tasks:changed'))
  }
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
    // The main process may have moved the task to 'doing' — refresh views
    notifyTasksChanged()
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
    notifyTasksChanged()
  },

  subscribe: () => {
    const unsubTick = window.electronAPI.pomodoro.onTick((data) => {
      set({ remainingSec: data.remaining, totalSec: data.total })
    })
    const unsubState = window.electronAPI.pomodoro.onStateChanged((state) => {
      const prev = get().state
      set({ state })
      get().fetchState()
      // When state transitions involve idle (start or end), task status may
      // have been changed by the main process — refresh views.
      if (prev !== state && (prev === 'idle' || state === 'idle')) {
        notifyTasksChanged()
      }
    })
    const unsubFinished = window.electronAPI.pomodoro.onSessionFinished(() => {
      notifyTasksChanged()
    })
    return () => { unsubTick(); unsubState(); unsubFinished() }
  },
}))
