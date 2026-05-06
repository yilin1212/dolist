import { ipcMain, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { PomodoroTimer } from '../pomodoro/timer'
import { showPomodoroMini, hidePomodoroMini } from '../windows/pomodoroMini'

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
  })
  ipcMain.handle('pomodoro:hideMini', () => hidePomodoroMini())
  ipcMain.handle('pomodoro:getState', () => ({
    state: timer.state,
    remaining: timer.remainingSec,
    total: timer.totalSec,
    kind: timer.kind,
    taskId: timer.taskId,
    completedFocusCount: timer.completedFocusCount,
  }))

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
}
