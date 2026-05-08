import { getDb, markDirty } from '../client'
import { v4 as uuidv4 } from 'uuid'
import type { Task } from '../../../../types/models'

type SqlValue = string | number | null | Uint8Array

function rowToTask(row: SqlValue[], tags: string[] = []): Task {
  return {
    id: row[0] as string,
    title: row[1] as string,
    description: (row[2] as string) || '',
    category_id: row[3] as string | null,
    priority: row[4] as number,
    status: row[5] as string,
    estimated_minutes: row[6] as number,
    actual_minutes: row[7] as number,
    due_date: row[8] as string | null,
    created_at: row[9] as string,
    completed_at: row[10] as string | null,
    repeat_type: (row[11] as string) || 'none',
    repeat_data: (row[12] as string) || '',
    parent_task_id: row[13] as string | null,
    list: (row[14] as string) || 'inbox',
    is_favorited: (row[15] as number) || 0,
    sort_order: (row[16] as number) || 0,
    reminder_at: row[17] as string | null,
    tags,
  }
}

function loadTags(taskId: string): string[] {
  const result = getDb().exec(
    'SELECT t.name FROM tags t JOIN task_tags tt ON tt.tag_id = t.id WHERE tt.task_id = ? ORDER BY t.name',
    [taskId]
  )
  if (result.length === 0) return []
  return result[0].values.map((r) => r[0] as string)
}

function saveTags(taskId: string, tags: string[]): void {
  getDb().run('DELETE FROM task_tags WHERE task_id = ?', [taskId])
  for (const tagName of tags) {
    const trimmed = tagName.trim()
    if (!trimmed) continue
    const existing = getDb().exec('SELECT id FROM tags WHERE name = ?', [trimmed])
    let tagId: string
    if (existing.length > 0 && existing[0].values.length > 0) {
      tagId = existing[0].values[0][0] as string
    } else {
      tagId = uuidv4()
      getDb().run('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, trimmed])
    }
    getDb().run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId])
  }
}

export const TaskRepo = {
  listAll(filters?: { status?: string; category_id?: string; include_done?: boolean; search?: string; list?: string }): Task[] {
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const params: SqlValue[] = []

    if (filters?.status) {
      sql += ' AND status = ?'
      params.push(filters.status)
    } else if (filters?.include_done === false) {
      sql += " AND status != 'done' AND status != 'cancelled'"
    }
    if (filters?.category_id) {
      sql += ' AND category_id = ?'
      params.push(filters.category_id)
    }
    if (filters?.list) {
      sql += ' AND list = ?'
      params.push(filters.list)
    }
    if (filters?.search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)'
      const q = `%${filters.search}%`
      params.push(q, q)
    }

    sql += ' ORDER BY priority DESC, created_at DESC'

    // Use a single query with JOIN to load tags instead of N+1 queries
    const tagJoinSql = `
      SELECT t.*, GROUP_CONCAT(tg.name) as tag_names
      FROM (${sql}) t
      LEFT JOIN task_tags tt ON tt.task_id = t.id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      GROUP BY t.id
    `
    const result = getDb().exec(tagJoinSql, params)
    if (result.length === 0) return []
    return result[0].values.map((row) => {
      const tagsStr = row[row.length - 1] as string | null
      const tags = tagsStr ? tagsStr.split(',').filter(Boolean) : []
      // Remove the extra tag_names column before passing to rowToTask
      return rowToTask(row.slice(0, -1), tags)
    })
  },

  get(id: string): Task | null {
    const result = getDb().exec('SELECT * FROM tasks WHERE id = ?', [id])
    if (result.length === 0 || result[0].values.length === 0) return null
    const row = result[0].values[0]
    return rowToTask(row, loadTags(id))
  },

  create(task: Partial<Task>): string {
    const id = task.id || uuidv4()
    const now = new Date().toISOString()
    getDb().run(
      `INSERT INTO tasks (id, title, description, category_id, priority, status,
        estimated_minutes, actual_minutes, due_date, created_at, completed_at,
        repeat_type, repeat_data, parent_task_id, list, is_favorited, sort_order, reminder_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, task.title || '', task.description || '', task.category_id || null,
        task.priority ?? 2, task.status || 'pending', task.estimated_minutes || 0,
        task.actual_minutes || 0, task.due_date || null, task.created_at || now,
        task.completed_at || null, task.repeat_type || 'none', task.repeat_data || '',
        task.parent_task_id || null, task.list || 'inbox', task.is_favorited || 0,
        task.sort_order || 0, task.reminder_at || null,
      ]
    )
    if (task.tags) saveTags(id, task.tags)
    markDirty()
    return id
  },

  update(task: Task): void {
    getDb().run(
      `UPDATE tasks SET title=?, description=?, category_id=?, priority=?, status=?,
        estimated_minutes=?, actual_minutes=?, due_date=?, completed_at=?,
        repeat_type=?, repeat_data=?, parent_task_id=?, list=?, is_favorited=?,
        sort_order=?, reminder_at=? WHERE id=?`,
      [
        task.title, task.description, task.category_id, task.priority, task.status,
        task.estimated_minutes, task.actual_minutes, task.due_date, task.completed_at,
        task.repeat_type, task.repeat_data, task.parent_task_id, task.list,
        task.is_favorited, task.sort_order, task.reminder_at, task.id,
      ]
    )
    saveTags(task.id, task.tags || [])
    markDirty()
  },

  delete(id: string): void {
    // Defensive: explicitly remove related rows in case sql.js does not enforce
    // ON DELETE CASCADE consistently across the in-memory DB.
    getDb().run('DELETE FROM task_tags WHERE task_id = ?', [id])
    getDb().run('DELETE FROM schedule_blocks WHERE task_id = ?', [id])
    getDb().run('UPDATE pomodoro_sessions SET task_id = NULL WHERE task_id = ?', [id])
    getDb().run('DELETE FROM tasks WHERE id = ?', [id])
    markDirty()
  },

  markDone(id: string): void {
    const now = new Date().toISOString()
    getDb().run("UPDATE tasks SET status='done', completed_at=? WHERE id=?", [now, id])
    markDirty()
  },

  markPending(id: string): void {
    getDb().run("UPDATE tasks SET status='pending', completed_at=NULL WHERE id=?", [id])
    markDirty()
  },

  addActualMinutes(id: string, minutes: number): void {
    getDb().run('UPDATE tasks SET actual_minutes = actual_minutes + ? WHERE id=?', [minutes, id])
    markDirty()
  },
}
