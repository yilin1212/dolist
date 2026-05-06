import { ipcMain } from 'electron'
import { TaskRepo } from '../db/repositories'

export function registerTaskIpc(): void {
  ipcMain.handle('task:list', (_, filters) => TaskRepo.listAll(filters))
  ipcMain.handle('task:get', (_, id: string) => TaskRepo.get(id))
  ipcMain.handle('task:create', (_, task) => TaskRepo.create(task))
  ipcMain.handle('task:update', (_, task) => TaskRepo.update(task))
  ipcMain.handle('task:delete', (_, id: string) => TaskRepo.delete(id))
  ipcMain.handle('task:markDone', (_, id: string) => TaskRepo.markDone(id))
  ipcMain.handle('task:markPending', (_, id: string) => TaskRepo.markPending(id))
}
