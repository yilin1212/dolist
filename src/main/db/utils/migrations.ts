import { Database } from 'sql.js'
import { v4 as uuidv4 } from 'uuid'

const MIGRATIONS: Array<{ version: number; name: string; run: (db: Database) => void }> = [
  {
    version: 1,
    name: 'create_tables',
    run(db) {
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#9B9B9B',
        sort_order INTEGER DEFAULT 0
      )`)
      db.run(`CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )`)
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        category_id TEXT,
        priority INTEGER DEFAULT 2,
        status TEXT DEFAULT 'pending',
        estimated_minutes INTEGER DEFAULT 0,
        actual_minutes INTEGER DEFAULT 0,
        due_date TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        repeat_type TEXT DEFAULT 'none',
        repeat_data TEXT DEFAULT '',
        parent_task_id TEXT,
        list TEXT DEFAULT 'inbox',
        is_favorited INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        reminder_at TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`)
      db.run(`CREATE TABLE IF NOT EXISTS task_tags (
        task_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (task_id, tag_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )`)
      db.run(`CREATE TABLE IF NOT EXISTS schedule_blocks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`)
      db.run(`CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        schedule_block_id TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        planned_duration_minutes INTEGER NOT NULL,
        actual_duration_minutes INTEGER,
        session_kind TEXT DEFAULT 'focus',
        status TEXT DEFAULT 'running',
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (schedule_block_id) REFERENCES schedule_blocks(id) ON DELETE SET NULL
      )`)
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`)
      db.run(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#4F8EF7',
        icon TEXT DEFAULT 'folder',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      )`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_start_time ON schedule_blocks(start_time)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_task_id ON schedule_blocks(task_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_pomo_task_id ON pomodoro_sessions(task_id)`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_pomo_started_at ON pomodoro_sessions(started_at)`)
    },
  },
  {
    version: 2,
    name: 'seed_defaults',
    run(db) {
      const categories = [
        { name: '工作', color: '#4F8EF7', sort: 0 },
        { name: '学习', color: '#7BC67E', sort: 1 },
        { name: '生活', color: '#F5A623', sort: 2 },
        { name: '其他', color: '#9B9B9B', sort: 3 },
      ]
      for (const cat of categories) {
        db.run(
          'INSERT OR IGNORE INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)',
          [uuidv4(), cat.name, cat.color, cat.sort]
        )
      }

      const settings: Record<string, string> = {
        pomodoro_focus_min: '25',
        pomodoro_short_break_min: '5',
        pomodoro_long_break_min: '15',
        pomodoro_long_break_every: '4',
        workday_start_hour: '9',
        workday_end_hour: '22',
        play_sound_on_finish: '1',
        auto_start_break: '0',
        locale: 'zh-CN',
      }
      for (const [key, value] of Object.entries(settings)) {
        db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value])
      }
    },
  },
]

export function runMigrations(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`)

  const row = db.exec("SELECT value FROM settings WHERE key = 'schema_version'")
  const parsed = row.length > 0 && row[0].values.length > 0
    ? parseInt(row[0].values[0][0] as string, 10)
    : 0
  const currentVersion = isNaN(parsed) ? 0 : parsed

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      try {
        db.run('BEGIN')
        migration.run(db)
        db.run(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', ?)",
          [String(migration.version)]
        )
        db.run('COMMIT')
      } catch (e) {
        console.error(`Migration ${migration.version} (${migration.name}) failed:`, e)
        try { db.run('ROLLBACK') } catch { /* best effort */ }
        // Stop at the failed migration so it can be retried on next launch
        break
      }
    }
  }
}
