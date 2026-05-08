import { getDb, markDirty } from '../client'
import { v4 as uuidv4 } from 'uuid'
import type { Category } from '../../../../types/models'

export const CategoryRepo = {
  listAll(): Category[] {
    const result = getDb().exec('SELECT * FROM categories ORDER BY sort_order, id')
    if (result.length === 0) return []
    return result[0].values.map((row) => ({
      id: row[0] as string,
      name: row[1] as string,
      color: row[2] as string,
      sort_order: row[3] as number,
    }))
  },

  get(id: string): Category | null {
    const result = getDb().exec('SELECT * FROM categories WHERE id = ?', [id])
    if (result.length === 0 || result[0].values.length === 0) return null
    const row = result[0].values[0]
    return { id: row[0] as string, name: row[1] as string, color: row[2] as string, sort_order: row[3] as number }
  },

  create(name: string, color: string): string {
    const id = uuidv4()
    getDb().run('INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, COALESCE((SELECT MAX(sort_order)+1 FROM categories), 0))', [id, name, color])
    markDirty()
    return id
  },

  update(category: Category): void {
    getDb().run('UPDATE categories SET name=?, color=?, sort_order=? WHERE id=?', [category.name, category.color, category.sort_order, category.id])
    markDirty()
  },

  delete(id: string): void {
    getDb().run('UPDATE tasks SET category_id = NULL WHERE category_id = ?', [id])
    getDb().run('DELETE FROM categories WHERE id = ?', [id])
    markDirty()
  },
}
