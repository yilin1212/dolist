import { ipcMain } from 'electron'
import { ScheduleRepo } from '../db/repositories'
import type { ScheduleBlock } from '../../../types/models'

export function registerScheduleIpc(): void {
  ipcMain.handle('schedule:listBetween', (_, start: string, end: string) => {
    try { return ScheduleRepo.listBetween(start, end) } catch (e) { console.error('schedule:listBetween failed:', e); throw e }
  })
  ipcMain.handle('schedule:listToday', () => {
    try { return ScheduleRepo.listToday() } catch (e) { console.error('schedule:listToday failed:', e); throw e }
  })
  ipcMain.handle('schedule:listByTask', (_, taskId: string) => {
    try { return ScheduleRepo.listByTask(taskId) } catch (e) { console.error('schedule:listByTask failed:', e); throw e }
  })
  ipcMain.handle('schedule:create', (_, block: Partial<ScheduleBlock>) => {
    try { return ScheduleRepo.create(block) } catch (e) { console.error('schedule:create failed:', e); throw e }
  })
  ipcMain.handle('schedule:update', (_, block: ScheduleBlock) => {
    try { return ScheduleRepo.update(block) } catch (e) { console.error('schedule:update failed:', e); throw e }
  })
  ipcMain.handle('schedule:delete', (_, id: string) => {
    try { return ScheduleRepo.delete(id) } catch (e) { console.error('schedule:delete failed:', e); throw e }
  })
  ipcMain.handle('schedule:markStatus', (_, id: string, status: string) => {
    try { return ScheduleRepo.markStatus(id, status) } catch (e) { console.error('schedule:markStatus failed:', e); throw e }
  })
}
