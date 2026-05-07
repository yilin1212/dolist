import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'path'
const isDev = !app.isPackaged
import { initDatabase } from './db/client'
import { registerTaskIpc } from './ipc/taskIpc'
import { registerCategoryIpc } from './ipc/categoryIpc'
import { registerTagIpc } from './ipc/tagIpc'
import { registerScheduleIpc } from './ipc/scheduleIpc'
import { registerSettingsIpc } from './ipc/settingsIpc'
import { registerPomodoroIpc } from './ipc/pomodoroIpc'
import { registerSchedulerIpc } from './ipc/schedulerIpc'
import { startReminderService } from './scheduler/reminderService'
import { createTray } from './tray/tray'
import { PomodoroTimer } from './pomodoro/timer'

let mainWindow: BrowserWindow | null = null
let pomodoroTimer: PomodoroTimer | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 1000,
    minHeight: 680,
    frame: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => {
    mainWindow?.hide()
  })
  ipcMain.on('window:show', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
  ipcMain.on('window:hide', () => {
    mainWindow?.hide()
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDatabase()

  pomodoroTimer = new PomodoroTimer()

  registerTaskIpc()
  registerCategoryIpc()
  registerTagIpc()
  registerScheduleIpc()
  registerSettingsIpc()
  registerPomodoroIpc(pomodoroTimer)
  registerSchedulerIpc()

  startReminderService(pomodoroTimer)

  createWindow()

  if (mainWindow) {
    createTray(mainWindow)
  }

  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
