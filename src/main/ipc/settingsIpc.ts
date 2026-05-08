import { ipcMain } from 'electron'
import { SettingsRepo } from '../db/repositories'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_, key: string) => {
    try { return SettingsRepo.get(key) } catch (e) { console.error('settings:get failed:', e); throw e }
  })
  ipcMain.handle('settings:set', (_, key: string, value: string) => {
    try { return SettingsRepo.set(key, value) } catch (e) { console.error('settings:set failed:', e); throw e }
  })
  ipcMain.handle('settings:getInt', (_, key: string, defaultVal?: number) => {
    try { return SettingsRepo.getInt(key, defaultVal) } catch (e) { console.error('settings:getInt failed:', e); throw e }
  })
  ipcMain.handle('settings:setInt', (_, key: string, value: number) => {
    try { return SettingsRepo.setInt(key, value) } catch (e) { console.error('settings:setInt failed:', e); throw e }
  })
  ipcMain.handle('settings:getBool', (_, key: string, defaultVal?: boolean) => {
    try { return SettingsRepo.getBool(key, defaultVal) } catch (e) { console.error('settings:getBool failed:', e); throw e }
  })
  ipcMain.handle('settings:setBool', (_, key: string, value: boolean) => {
    try { return SettingsRepo.setBool(key, value) } catch (e) { console.error('settings:setBool failed:', e); throw e }
  })
}
