import { create } from 'zustand'
import { useTaskStore } from '../tasks/store'
import { notifyTasksChanged } from '../../lib/utils'

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

function notifyPomodoroTasksChanged(): void {
  // Pull a fresh task list (main process may have moved status to/from 'doing'),
  // and let any other store that cares (e.g. ScheduleStore) react too.
  useTaskStore.getState().fetchTasks()
  notifyTasksChanged()
}

let subscriptionCount = 0
let unsubscribers: Array<() => void> = []

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
    try {
      await window.electronAPI.pomodoro.startFocus(minutes, taskId, blockId)
      await get().fetchState()
      // The main process may have moved the task to 'doing' — refresh views
      notifyPomodoroTasksChanged()
    } catch (e) {
      console.error('Failed to start focus:', e)
      throw e
    }
  },

  startBreak: async (kind = 'short_break') => {
    try {
      await window.electronAPI.pomodoro.startBreak(kind)
      await get().fetchState()
    } catch (e) {
      console.error('Failed to start break:', e)
      throw e
    }
  },

  pause: async () => {
    try {
      await window.electronAPI.pomodoro.pause()
      await get().fetchState()
    } catch (e) {
      console.error('Failed to pause pomodoro:', e)
    }
  },

  resume: async () => {
    try {
      await window.electronAPI.pomodoro.resume()
      await get().fetchState()
    } catch (e) {
      console.error('Failed to resume pomodoro:', e)
    }
  },

  stop: async () => {
    try {
      await window.electronAPI.pomodoro.stop()
      await get().fetchState()
      notifyPomodoroTasksChanged()
    } catch (e) {
      console.error('Failed to stop pomodoro:', e)
      throw e
    }
  },

  subscribe: () => {
    subscriptionCount++
    if (subscriptionCount === 1) {
      try {
        const unsubTick = window.electronAPI.pomodoro.onTick((data) => {
          set({ remainingSec: data.remaining, totalSec: data.total })
        })
        const unsubState = window.electronAPI.pomodoro.onStateChanged((state) => {
          const prev = get().state
          set({ state })
          get().fetchState()
          if (prev !== state && (prev === 'idle' || state === 'idle')) {
            notifyPomodoroTasksChanged()
          }
        })
        const unsubFinished = window.electronAPI.pomodoro.onSessionFinished(() => {
          notifyPomodoroTasksChanged()
        })
        unsubscribers = [unsubTick, unsubState, unsubFinished]
      } catch (e) {
        console.error('Failed to subscribe to pomodoro events:', e)
      }
    }
    return () => {
      subscriptionCount--
      if (subscriptionCount <= 0) {
        subscriptionCount = 0
        unsubscribers.forEach((fn) => fn())
        unsubscribers = []
      }
    }
  },
}))
