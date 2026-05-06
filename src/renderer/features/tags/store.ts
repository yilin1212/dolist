import { create } from 'zustand'
import type { Tag } from '../../../../types/models'

interface TagStore {
  tags: Tag[]
  fetchTags: () => Promise<void>
  createTag: (name: string) => Promise<void>
  deleteTag: (id: string) => Promise<void>
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  fetchTags: async () => {
    try {
      const tags = await window.electronAPI.tags.list()
      set({ tags })
    } catch (e) {
      console.error('Failed to fetch tags:', e)
    }
  },
  createTag: async (name) => {
    await window.electronAPI.tags.ensure(name)
    await get().fetchTags()
  },
  deleteTag: async (id) => {
    await window.electronAPI.tags.delete(id)
    await get().fetchTags()
  },
}))
