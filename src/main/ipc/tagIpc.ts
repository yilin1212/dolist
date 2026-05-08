import { ipcMain } from 'electron'
import { TagRepo } from '../db/repositories'

export function registerTagIpc(): void {
  ipcMain.handle('tag:list', () => {
    try { return TagRepo.listAll() } catch (e) { console.error('tag:list failed:', e); throw e }
  })
  ipcMain.handle('tag:ensure', (_, name: string) => {
    try { return TagRepo.ensure(name) } catch (e) { console.error('tag:ensure failed:', e); throw e }
  })
  ipcMain.handle('tag:delete', (_, id: string) => {
    try { return TagRepo.delete(id) } catch (e) { console.error('tag:delete failed:', e); throw e }
  })
}
