import { getDb, markDirty } from '../client'

export const SettingsRepo = {
  get(key: string, defaultValue: string | null = null): string | null {
    const result = getDb().exec('SELECT value FROM settings WHERE key = ?', [key])
    if (result.length === 0 || result[0].values.length === 0) return defaultValue
    return (result[0].values[0][0] as string) ?? defaultValue
  },

  getInt(key: string, defaultValue = 0): number {
    const v = this.get(key)
    if (v === null) return defaultValue
    const n = parseInt(v, 10)
    return isNaN(n) ? defaultValue : n
  },

  getBool(key: string, defaultValue = false): boolean {
    const v = this.get(key)
    if (v === null) return defaultValue
    return v === '1' || v === 'true' || v === 'True' || v === 'yes'
  },

  set(key: string, value: string): void {
    getDb().run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
    markDirty()
  },

  setInt(key: string, value: number): void {
    this.set(key, String(value))
  },

  setBool(key: string, value: boolean): void {
    this.set(key, value ? '1' : '0')
  },
}
