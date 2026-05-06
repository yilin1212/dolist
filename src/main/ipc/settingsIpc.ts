import { ipcMain } from 'electron'
import { SettingsRepo } from '../db/repositories'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_, key: string) => SettingsRepo.get(key))
  ipcMain.handle('settings:set', (_, key: string, value: string) => SettingsRepo.set(key, value))
  ipcMain.handle('settings:getInt', (_, key: string, defaultVal?: number) =>
    SettingsRepo.getInt(key, defaultVal)
  )
  ipcMain.handle('settings:setInt', (_, key: string, value: number) =>
    SettingsRepo.setInt(key, value)
  )
  ipcMain.handle('settings:getBool', (_, key: string, defaultVal?: boolean) =>
    SettingsRepo.getBool(key, defaultVal)
  )
  ipcMain.handle('settings:setBool', (_, key: string, value: boolean) =>
    SettingsRepo.setBool(key, value)
  )
}
