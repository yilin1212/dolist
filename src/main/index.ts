import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'path'
const isDev = !app.isPackaged

// Allow E2E tests to redirect the on-disk database / settings to a temp dir so
// they never touch the user's real DoList data. Must be applied before any
// app.whenReady() consumer (e.g. db/client) reads getPath('userData').
if (process.env['DOLIST_USER_DATA']) {
  app.setPath('userData', process.env['DOLIST_USER_DATA'])
}

import { initDatabase, saveToDisk, closeDatabase } from './db/client'
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

const MAIN_WINDOW_W = 1240
const MAIN_WINDOW_H = 820
const MAIN_WINDOW_MIN_W = 1000
const MAIN_WINDOW_MIN_H = 680

function registerWindowIpc(): void {
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
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_W,
    height: MAIN_WINDOW_H,
    minWidth: MAIN_WINDOW_MIN_W,
    minHeight: MAIN_WINDOW_MIN_H,
    frame: false,
    show: false,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  const loadPromise = isDev && process.env['ELECTRON_RENDERER_URL']
    ? mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    : mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  loadPromise.catch((e) => {
    console.error('Failed to load main window:', e)
  })
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

  registerWindowIpc()

  startReminderService(pomodoroTimer)

  createWindow()

  if (mainWindow) {
    createTray(mainWindow)
  }

  const registered = globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
  if (!registered) {
    console.warn('Failed to register global shortcut Ctrl+Shift+D')
  }

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
  closeDatabase()
})
