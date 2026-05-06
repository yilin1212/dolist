import { getDb, markDirty } from '../client'
import { v4 as uuidv4 } from 'uuid'
import type { Tag } from '../../../../types/models'

export const TagRepo = {
  listAll(): Tag[] {
    const result = getDb().exec('SELECT * FROM tags ORDER BY name')
    if (result.length === 0) return []
    return result[0].values.map((row) => ({
      id: row[0] as string,
      name: row[1] as string,
    }))
  },

  ensure(name: string): string {
    const existing = getDb().exec('SELECT id FROM tags WHERE name = ?', [name])
    if (existing.length > 0 && existing[0].values.length > 0) {
      return existing[0].values[0][0] as string
    }
    const id = uuidv4()
    getDb().run('INSERT INTO tags (id, name) VALUES (?, ?)', [id, name])
    markDirty()
    return id
  },

  delete(id: string): void {
    getDb().run('DELETE FROM tags WHERE id = ?', [id])
    markDirty()
  },
}
