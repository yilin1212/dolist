import { ipcMain } from 'electron'
import { TaskRepo } from '../db/repositories'
import type { Task } from '../../../types/models'

export function registerTaskIpc(): void {
  ipcMain.handle('task:list', (_, filters?: Parameters<typeof TaskRepo.listAll>[0]) => {
    try { return TaskRepo.listAll(filters) } catch (e) { console.error('task:list failed:', e); throw e }
  })
  ipcMain.handle('task:get', (_, id: string) => {
    try { return TaskRepo.get(id) } catch (e) { console.error('task:get failed:', e); throw e }
  })
  ipcMain.handle('task:create', (_, task: Partial<Task>) => {
    try { return TaskRepo.create(task) } catch (e) { console.error('task:create failed:', e); throw e }
  })
  ipcMain.handle('task:update', (_, task: Task) => {
    try { return TaskRepo.update(task) } catch (e) { console.error('task:update failed:', e); throw e }
  })
  ipcMain.handle('task:delete', (_, id: string) => {
    try { return TaskRepo.delete(id) } catch (e) { console.error('task:delete failed:', e); throw e }
  })
  ipcMain.handle('task:markDone', (_, id: string) => {
    try { return TaskRepo.markDone(id) } catch (e) { console.error('task:markDone failed:', e); throw e }
  })
  ipcMain.handle('task:markPending', (_, id: string) => {
    try { return TaskRepo.markPending(id) } catch (e) { console.error('task:markPending failed:', e); throw e }
  })
}
