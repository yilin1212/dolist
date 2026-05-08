import initSqlJs, { Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'
import { runMigrations } from './utils/migrations'

let db: Database | null = null
let dirty = false
let saveTimer: ReturnType<typeof setTimeout> | null = null
let periodicSaveTimer: ReturnType<typeof setInterval> | null = null

const DB_FILENAME = 'dolist.db'
const SAVE_DEBOUNCE_MS = 500
const PERIODIC_SAVE_MS = 60_000

function getDbPath(): string {
  const userData = app.getPath('userData')
  return join(userData, DB_FILENAME)
}

export function markDirty(): void {
  dirty = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveToDisk, SAVE_DEBOUNCE_MS)
}

export function saveToDisk(): void {
  if (!db || !dirty) return
  try {
    const data = db.export()
    const path = getDbPath()
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, Buffer.from(data))
    dirty = false
  } catch (e) {
    console.error('Failed to save database:', e)
  }
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()
  const dbPath = getDbPath()

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  runMigrations(db)
  markDirty()

  // Periodic save every 60 seconds
  periodicSaveTimer = setInterval(saveToDisk, PERIODIC_SAVE_MS)
}

export function closeDatabase(): void {
  if (periodicSaveTimer) {
    clearInterval(periodicSaveTimer)
    periodicSaveTimer = null
  }
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  saveToDisk()
  if (db) {
    db.close()
    db = null
  }
}
