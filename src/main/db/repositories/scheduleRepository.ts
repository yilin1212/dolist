import { getDb, markDirty } from '../client'
import { v4 as uuidv4 } from 'uuid'
import type { ScheduleBlock } from '../../../../types/models'

function rowToBlock(row: any[]): ScheduleBlock {
  return {
    id: row[0] as string,
    task_id: row[1] as string,
    start_time: row[2] as string,
    end_time: row[3] as string,
    status: (row[4] as string) || 'pending',
    created_at: row[5] as string,
  }
}

export const ScheduleRepo = {
  listBetween(start: string, end: string): ScheduleBlock[] {
    const result = getDb().exec(
      'SELECT * FROM schedule_blocks WHERE start_time >= ? AND start_time < ? ORDER BY start_time',
      [start, end]
    )
    if (result.length === 0) return []
    return result[0].values.map(rowToBlock)
  },

  listByTask(taskId: string): ScheduleBlock[] {
    const result = getDb().exec(
      'SELECT * FROM schedule_blocks WHERE task_id = ? ORDER BY start_time',
      [taskId]
    )
    if (result.length === 0) return []
    return result[0].values.map(rowToBlock)
  },

  listToday(): ScheduleBlock[] {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
    return this.listBetween(start, end)
  },

  get(id: string): ScheduleBlock | null {
    const result = getDb().exec('SELECT * FROM schedule_blocks WHERE id = ?', [id])
    if (result.length === 0 || result[0].values.length === 0) return null
    return rowToBlock(result[0].values[0])
  },

  create(block: Partial<ScheduleBlock>): string {
    const id = block.id || uuidv4()
    const now = new Date().toISOString()
    getDb().run(
      'INSERT INTO schedule_blocks (id, task_id, start_time, end_time, status, created_at) VALUES (?,?,?,?,?,?)',
      [id, block.task_id, block.start_time, block.end_time, block.status || 'pending', block.created_at || now]
    )
    markDirty()
    return id
  },

  update(block: ScheduleBlock): void {
    getDb().run(
      'UPDATE schedule_blocks SET task_id=?, start_time=?, end_time=?, status=? WHERE id=?',
      [block.task_id, block.start_time, block.end_time, block.status, block.id]
    )
    markDirty()
  },

  delete(id: string): void {
    getDb().run('DELETE FROM schedule_blocks WHERE id = ?', [id])
    markDirty()
  },

  markStatus(id: string, status: string): void {
    getDb().run('UPDATE schedule_blocks SET status=? WHERE id=?', [status, id])
    markDirty()
  },
}
