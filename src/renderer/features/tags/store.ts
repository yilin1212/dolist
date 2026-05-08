import { create } from 'zustand'
import type { Tag } from '../../../../types/models'
import { notifyTasksChanged } from '../../lib/utils'

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
    try {
      await window.electronAPI.tags.ensure(name)
      await get().fetchTags()
    } catch (e) {
      console.error('Failed to create tag:', e)
      throw e
    }
  },
  deleteTag: async (id) => {
    try {
      await window.electronAPI.tags.delete(id)
      await get().fetchTags()
      // Tasks may still reference this tag; refresh other views
      notifyTasksChanged()
    } catch (e) {
      console.error('Failed to delete tag:', e)
      throw e
    }
  },
}))
