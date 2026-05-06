import { ipcMain } from 'electron'
import { CategoryRepo } from '../db/repositories'

export function registerCategoryIpc(): void {
  ipcMain.handle('category:list', () => CategoryRepo.listAll())
  ipcMain.handle('category:create', (_, name: string, color: string) => CategoryRepo.create(name, color))
  ipcMain.handle('category:update', (_, category) => CategoryRepo.update(category))
  ipcMain.handle('category:delete', (_, id: string) => CategoryRepo.delete(id))
}
