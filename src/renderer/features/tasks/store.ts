import { create } from 'zustand'
import type { Task } from '../../../../types/models'

interface TaskFilters {
  status?: string
  category_id?: string
  include_done: boolean
  search: string
  list?: string
}

interface TaskStore {
  tasks: Task[]
  filters: TaskFilters
  selectedTaskId: string | null
  loading: boolean

  fetchTasks: () => Promise<void>
  createTask: (task: Partial<Task>) => Promise<string>
  updateTask: (task: Task) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  markDone: (id: string) => Promise<void>
  markPending: (id: string) => Promise<void>
  setFilters: (filters: Partial<TaskFilters>) => void
  setSelectedTask: (id: string | null) => void
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  filters: {
    include_done: true,
    search: '',
  },
  selectedTaskId: null,
  loading: false,

  fetchTasks: async () => {
    set({ loading: true })
    try {
      const { filters } = get()
      const tasks = await window.electronAPI.tasks.list(filters)
      set({ tasks, loading: false })
    } catch (e) {
      console.error('Failed to fetch tasks:', e)
      set({ loading: false })
    }
  },

  createTask: async (task) => {
    const id = await window.electronAPI.tasks.create(task)
    await get().fetchTasks()
    return id
  },

  updateTask: async (task) => {
    await window.electronAPI.tasks.update(task)
    await get().fetchTasks()
  },

  deleteTask: async (id) => {
    await window.electronAPI.tasks.delete(id)
    await get().fetchTasks()
  },

  markDone: async (id) => {
    await window.electronAPI.tasks.markDone(id)
    await get().fetchTasks()
  },

  markPending: async (id) => {
    await window.electronAPI.tasks.markPending(id)
    await get().fetchTasks()
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }))
    get().fetchTasks()
  },

  setSelectedTask: (id) => set({ selectedTaskId: id }),
}))
