import { create } from 'zustand'
import type { ScheduleBlock } from '../../../../types/models'

interface ScheduleStore {
  blocks: ScheduleBlock[]
  rangeStart: string | null
  rangeEnd: string | null
  loading: boolean

  loadRange: (start: string, end: string) => Promise<void>
  refresh: () => Promise<void>
  createBlock: (block: Partial<ScheduleBlock>) => Promise<string>
  updateBlock: (block: ScheduleBlock) => Promise<void>
  deleteBlock: (id: string) => Promise<void>
  markStatus: (id: string, status: string) => Promise<void>
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  blocks: [],
  rangeStart: null,
  rangeEnd: null,
  loading: false,

  loadRange: async (start, end) => {
    set({ loading: true, rangeStart: start, rangeEnd: end })
    try {
      const blocks = await window.electronAPI.schedule.listBetween(start, end)
      set({ blocks, loading: false })
    } catch (e) {
      console.error('Failed to load schedule blocks:', e)
      set({ loading: false })
    }
  },

  refresh: async () => {
    const { rangeStart, rangeEnd } = get()
    if (rangeStart && rangeEnd) {
      await get().loadRange(rangeStart, rangeEnd)
    }
  },

  createBlock: async (block) => {
    try {
      const id = await window.electronAPI.schedule.create(block)
      await get().refresh()
      return id
    } catch (e) {
      console.error('Failed to create schedule block:', e)
      throw e
    }
  },

  updateBlock: async (block) => {
    try {
      await window.electronAPI.schedule.update(block)
      await get().refresh()
    } catch (e) {
      console.error('Failed to update schedule block:', e)
      throw e
    }
  },

  deleteBlock: async (id) => {
    try {
      await window.electronAPI.schedule.delete(id)
      await get().refresh()
    } catch (e) {
      console.error('Failed to delete schedule block:', e)
      throw e
    }
  },

  markStatus: async (id, status) => {
    try {
      await window.electronAPI.schedule.markStatus(id, status)
      await get().refresh()
    } catch (e) {
      console.error('Failed to mark schedule block status:', e)
      throw e
    }
  },
}))

// When tasks change (create/update/delete), schedule_blocks may have been
// cascade-deleted (FK ON DELETE CASCADE) or new ones added by ScheduleDialog.
// Refresh whoever is currently scoped to a range. Debounced to coalesce
// rapid-fire events (e.g. bulk task operations).
if (typeof window !== 'undefined') {
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null
  window.addEventListener('tasks:changed', () => {
    if (refreshTimeout) clearTimeout(refreshTimeout)
    refreshTimeout = setTimeout(() => {
      useScheduleStore.getState().refresh()
    }, 200)
  })
}
