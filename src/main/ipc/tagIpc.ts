import { ipcMain } from 'electron'
import { TagRepo } from '../db/repositories'

export function registerTagIpc(): void {
  ipcMain.handle('tag:list', () => TagRepo.listAll())
  ipcMain.handle('tag:ensure', (_, name: string) => TagRepo.ensure(name))
  ipcMain.handle('tag:delete', (_, id: string) => TagRepo.delete(id))
}
