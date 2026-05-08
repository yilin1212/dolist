import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { SettingsRepo } from '../db/repositories'

let tray: Tray | null = null

function getLocale(): string {
  try { return SettingsRepo.get('locale', 'zh-CN') || 'zh-CN' } catch { return 'zh-CN' }
}

function t(zh: string, en: string): string {
  return getLocale() === 'en' ? en : zh
}

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  if (!existsSync(iconPath)) {
    console.warn('Tray icon not found at:', iconPath)
    return
  }
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('DoList')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: t('显示主窗口', 'Show Main Window'),
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: t('退出', 'Quit'),
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}
