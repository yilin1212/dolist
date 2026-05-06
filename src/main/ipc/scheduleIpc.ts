import { ipcMain } from 'electron'
import { ScheduleRepo } from '../db/repositories'

export function registerScheduleIpc(): void {
  ipcMain.handle('schedule:listBetween', (_, start: string, end: string) =>
    ScheduleRepo.listBetween(start, end)
  )
  ipcMain.handle('schedule:listToday', () => ScheduleRepo.listToday())
  ipcMain.handle('schedule:create', (_, block) => ScheduleRepo.create(block))
  ipcMain.handle('schedule:update', (_, block) => ScheduleRepo.update(block))
  ipcMain.handle('schedule:delete', (_, id: string) => ScheduleRepo.delete(id))
  ipcMain.handle('schedule:markStatus', (_, id: string, status: string) =>
    ScheduleRepo.markStatus(id, status)
  )
}
