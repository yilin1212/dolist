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
    const id = await window.electronAPI.schedule.create(block)
    await get().refresh()
    return id
  },

  updateBlock: async (block) => {
    await window.electronAPI.schedule.update(block)
    await get().refresh()
  },

  deleteBlock: async (id) => {
    await window.electronAPI.schedule.delete(id)
    await get().refresh()
  },

  markStatus: async (id, status) => {
    await window.electronAPI.schedule.markStatus(id, status)
    await get().refresh()
  },
}))

// When tasks change (create/update/delete), schedule_blocks may have been
// cascade-deleted (FK ON DELETE CASCADE) or new ones added by ScheduleDialog.
// Refresh whoever is currently scoped to a range.
if (typeof window !== 'undefined') {
  window.addEventListener('tasks:changed', () => {
    useScheduleStore.getState().refresh()
  })
}
