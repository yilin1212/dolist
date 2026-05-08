import { create } from 'zustand'
import type { Task } from '../../../../types/models'
import { notifyTasksChanged } from '../../lib/utils'

interface TaskFilters {
  status?: string
  category_id?: string
  include_done: boolean
  search: string
}

interface TaskStore {
  tasks: Task[]
  filters: TaskFilters
  loading: boolean

  fetchTasks: () => Promise<void>
  createTask: (task: Partial<Task>) => Promise<string>
  updateTask: (task: Task) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  markDone: (id: string) => Promise<void>
  markPending: (id: string) => Promise<void>
  setFilters: (filters: Partial<TaskFilters>) => void
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null
let fetchRequestCounter = 0

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  filters: {
    include_done: true,
    search: '',
  },
  loading: false,

  fetchTasks: async () => {
    const requestId = ++fetchRequestCounter
    set({ loading: true })
    try {
      const { filters } = get()
      const tasks = await window.electronAPI.tasks.list(filters)
      if (requestId === fetchRequestCounter) {
        set({ tasks, loading: false })
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e)
      if (requestId === fetchRequestCounter) {
        set({ loading: false })
      }
    }
  },

  createTask: async (task) => {
    try {
      const id = await window.electronAPI.tasks.create(task)
      await get().fetchTasks()
      notifyTasksChanged()
      return id
    } catch (e) {
      console.error('Failed to create task:', e)
      throw e
    }
  },

  updateTask: async (task) => {
    try {
      await window.electronAPI.tasks.update(task)
      await get().fetchTasks()
      notifyTasksChanged()
    } catch (e) {
      console.error('Failed to update task:', e)
      throw e
    }
  },

  deleteTask: async (id) => {
    try {
      await window.electronAPI.tasks.delete(id)
      await get().fetchTasks()
      notifyTasksChanged()
    } catch (e) {
      console.error('Failed to delete task:', e)
      throw e
    }
  },

  markDone: async (id) => {
    try {
      await window.electronAPI.tasks.markDone(id)
      await get().fetchTasks()
      notifyTasksChanged()
    } catch (e) {
      console.error('Failed to mark task done:', e)
      throw e
    }
  },

  markPending: async (id) => {
    try {
      await window.electronAPI.tasks.markPending(id)
      await get().fetchTasks()
      notifyTasksChanged()
    } catch (e) {
      console.error('Failed to mark task pending:', e)
      throw e
    }
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }))
    // Search changes are debounced; other filter changes (status, category, include_done) take effect immediately.
    if ('search' in filters) {
      if (searchDebounce) clearTimeout(searchDebounce)
      searchDebounce = setTimeout(() => {
        get().fetchTasks()
      }, 250)
    } else {
      get().fetchTasks()
    }
  },
}))
