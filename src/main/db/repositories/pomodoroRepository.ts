import { getDb, markDirty } from '../client'
import { v4 as uuidv4 } from 'uuid'
import type { PomodoroSession } from '../../../../types/models'

function rowToSession(row: any[]): PomodoroSession {
  return {
    id: row[0] as string,
    task_id: row[1] as string | null,
    schedule_block_id: row[2] as string | null,
    started_at: row[3] as string,
    completed_at: row[4] as string | null,
    planned_duration_minutes: row[5] as number,
    actual_duration_minutes: row[6] as number | null,
    session_kind: (row[7] as string) || 'focus',
    status: (row[8] as string) || 'running',
  }
}

export const PomodoroRepo = {
  create(session: Partial<PomodoroSession>): string {
    const id = session.id || uuidv4()
    const now = new Date().toISOString()
    getDb().run(
      `INSERT INTO pomodoro_sessions (id, task_id, schedule_block_id, started_at, completed_at,
        planned_duration_minutes, actual_duration_minutes, session_kind, status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id, session.task_id || null, session.schedule_block_id || null,
        session.started_at || now, session.completed_at || null,
        session.planned_duration_minutes || 25, session.actual_duration_minutes || null,
        session.session_kind || 'focus', session.status || 'running',
      ]
    )
    markDirty()
    return id
  },

  update(session: PomodoroSession): void {
    getDb().run(
      `UPDATE pomodoro_sessions SET task_id=?, schedule_block_id=?, completed_at=?,
        actual_duration_minutes=?, status=? WHERE id=?`,
      [session.task_id, session.schedule_block_id, session.completed_at,
        session.actual_duration_minutes, session.status, session.id]
    )
    markDirty()
  },

  listBetween(start: string, end: string): PomodoroSession[] {
    const result = getDb().exec(
      'SELECT * FROM pomodoro_sessions WHERE started_at >= ? AND started_at < ? ORDER BY started_at',
      [start, end]
    )
    if (result.length === 0) return []
    return result[0].values.map(rowToSession)
  },

  listByTask(taskId: string): PomodoroSession[] {
    const result = getDb().exec(
      'SELECT * FROM pomodoro_sessions WHERE task_id=? ORDER BY started_at',
      [taskId]
    )
    if (result.length === 0) return []
    return result[0].values.map(rowToSession)
  },
}
