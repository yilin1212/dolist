import { ipcMain, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { PomodoroTimer } from '../pomodoro/timer'
import { PomodoroRepo } from '../db/repositories'
import { showPomodoroMini, hidePomodoroMini, getPomodoroMini } from '../windows/pomodoroMini'

export function registerPomodoroIpc(timer: PomodoroTimer): void {
  ipcMain.handle('pomodoro:startFocus', (_, minutes: number, taskId?: string, blockId?: string) =>
    timer.startFocus(minutes, taskId, blockId)
  )
  ipcMain.handle('pomodoro:startBreak', (_, kind: string) => timer.startBreak(kind))
  ipcMain.handle('pomodoro:pause', () => timer.pause())
  ipcMain.handle('pomodoro:resume', () => timer.resume())
  ipcMain.handle('pomodoro:stop', () => timer.stop())
  ipcMain.handle('pomodoro:showMini', () => {
    const isDev = !app.isPackaged
    const url = isDev
      ? process.env['ELECTRON_RENDERER_URL'] + '#/mini'
      : join(__dirname, '../renderer/index.html#/mini')
    showPomodoroMini(url)
    // Minimise main window so the mini overlay takes over
    BrowserWindow.getAllWindows().forEach((w) => {
      // Avoid hiding the mini window itself (it has skipTaskbar:true)
      if (!w.webContents.getURL().includes('#/mini')) {
        w.hide()
      }
    })
  })
  ipcMain.handle('pomodoro:hideMini', () => {
    hidePomodoroMini()
    // Restore the main window when the mini is closed
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.webContents.getURL().includes('#/mini')) {
        if (!w.isVisible()) w.show()
        w.focus()
      }
    })
  })
  ipcMain.handle('pomodoro:getState', () => ({
    state: timer.state,
    remaining: timer.remainingSec,
    total: timer.totalSec,
    kind: timer.kind,
    taskId: timer.taskId,
    completedFocusCount: timer.completedFocusCount,
  }))
  ipcMain.handle('pomodoro:listBetween', (_, start: string, end: string) =>
    PomodoroRepo.listBetween(start, end)
  )
  ipcMain.handle('pomodoro:setMiniBounds', (_, width: number, height: number) => {
    const win = getPomodoroMini()
    if (!win) return
    const w = Math.round(Math.max(200, Math.min(600, width)))
    const h = Math.round(Math.max(90, Math.min(300, height)))
    const [x, y] = win.getPosition()
    win.setBounds({ x, y, width: w, height: h })
  })

  // Forward timer events to all windows
  timer.on('tick', (remaining: number, total: number) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send('pomodoro:tick', { remaining, total })
    )
  })
  timer.on('stateChanged', (state: string) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send('pomodoro:stateChanged', state)
    )
  })
  timer.on('sessionFinished', (data: { id: string; kind: string }) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send('pomodoro:sessionFinished', data)
    )
  })
  timer.on('sessionCancelled', (data: { id: string; kind: string }) => {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send('pomodoro:sessionCancelled', data)
    )
  })
}
