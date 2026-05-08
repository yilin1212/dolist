import { ipcMain } from 'electron'
import { CategoryRepo } from '../db/repositories'
import type { Category } from '../../../types/models'

export function registerCategoryIpc(): void {
  ipcMain.handle('category:list', () => {
    try { return CategoryRepo.listAll() } catch (e) { console.error('category:list failed:', e); throw e }
  })
  ipcMain.handle('category:create', (_, name: string, color: string) => {
    try { return CategoryRepo.create(name, color) } catch (e) { console.error('category:create failed:', e); throw e }
  })
  ipcMain.handle('category:update', (_, category: Category) => {
    try { return CategoryRepo.update(category) } catch (e) { console.error('category:update failed:', e); throw e }
  })
  ipcMain.handle('category:delete', (_, id: string) => {
    try { return CategoryRepo.delete(id) } catch (e) { console.error('category:delete failed:', e); throw e }
  })
}
