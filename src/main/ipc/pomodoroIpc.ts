import { ipcMain, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { PomodoroTimer } from '../pomodoro/timer'
import { PomodoroRepo } from '../db/repositories'
import { showPomodoroMini, hidePomodoroMini, getPomodoroMini } from '../windows/pomodoroMini'
import { MINI_MIN_W, MINI_MIN_H, MINI_MAX_W, MINI_MAX_H } from '../windows/pomodoroMini'

export function registerPomodoroIpc(timer: PomodoroTimer): void {
  ipcMain.handle('pomodoro:startFocus', (_, minutes: number, taskId?: string, blockId?: string) => {
    try { return timer.startFocus(minutes, taskId, blockId) } catch (e) { console.error('pomodoro:startFocus failed:', e); throw e }
  })
  ipcMain.handle('pomodoro:startBreak', (_, kind: string) => {
    try { return timer.startBreak(kind) } catch (e) { console.error('pomodoro:startBreak failed:', e); throw e }
  })
  ipcMain.handle('pomodoro:pause', () => { try { timer.pause() } catch (e) { console.error('pomodoro:pause failed:', e); throw e } })
  ipcMain.handle('pomodoro:resume', () => { try { timer.resume() } catch (e) { console.error('pomodoro:resume failed:', e); throw e } })
  ipcMain.handle('pomodoro:stop', () => { try { timer.stop() } catch (e) { console.error('pomodoro:stop failed:', e); throw e } })
  ipcMain.handle('pomodoro:showMini', () => {
    try {
      // Use the dev server URL only when both: not packaged AND the env var
      // is actually set (electron-vite dev mode). Otherwise fall back to a
      // proper file:// URL with a hash fragment so HashRouter resolves /mini.
      const rendererUrl = process.env['ELECTRON_RENDERER_URL']
      const useDevServer = !app.isPackaged && !!rendererUrl
      const url = useDevServer
        ? rendererUrl + '#/mini'
        : pathToFileURL(join(__dirname, '../renderer/index.html')).toString() + '#/mini'
      showPomodoroMini(url)
      BrowserWindow.getAllWindows().forEach((w) => {
        if (!w.webContents.getURL().includes('#/mini')) {
          w.hide()
        }
      })
    } catch (e) { console.error('pomodoro:showMini failed:', e); throw e }
  })
  ipcMain.handle('pomodoro:hideMini', () => {
    try {
      hidePomodoroMini()
      BrowserWindow.getAllWindows().forEach((w) => {
        if (!w.webContents.getURL().includes('#/mini')) {
          if (!w.isVisible()) w.show()
          w.focus()
        }
      })
    } catch (e) { console.error('pomodoro:hideMini failed:', e); throw e }
  })
  ipcMain.handle('pomodoro:getState', () => {
    try {
      return {
        state: timer.state,
        remaining: timer.remainingSec,
        total: timer.totalSec,
        kind: timer.kind,
        taskId: timer.taskId,
        completedFocusCount: timer.completedFocusCount,
      }
    } catch (e) { console.error('pomodoro:getState failed:', e); throw e }
  })
  ipcMain.handle('pomodoro:listBetween', (_, start: string, end: string) => {
    try { return PomodoroRepo.listBetween(start, end) } catch (e) { console.error('pomodoro:listBetween failed:', e); throw e }
  })
  ipcMain.handle('pomodoro:setMiniBounds', (_, width: number, height: number) => {
    try {
      const win = getPomodoroMini()
      if (!win) return
      const w = Math.round(Math.max(MINI_MIN_W, Math.min(MINI_MAX_W, width)))
      const h = Math.round(Math.max(MINI_MIN_H, Math.min(MINI_MAX_H, height)))
      const [x, y] = win.getPosition()
      win.setBounds({ x, y, width: w, height: h })
    } catch (e) { console.error('pomodoro:setMiniBounds failed:', e); throw e }
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
