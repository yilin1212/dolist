import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

export const MINI_MIN_W = 240
export const MINI_MIN_H = 90
export const MINI_MAX_W = 600
export const MINI_MAX_H = 300
const MINI_DEFAULT_W = 260
const MINI_DEFAULT_H = 130
const MINI_MARGIN = 20
// Backup show timeout: if ready-to-show hasn't fired by then we force show()
// so the user never ends up with the main window hidden and no mini visible.
const MINI_SHOW_FALLBACK_MS = 1500

let miniWindow: BrowserWindow | null = null

export function showPomodoroMini(url: string): void {
  if (miniWindow && !miniWindow.isDestroyed()) {
    if (miniWindow.isMinimized()) miniWindow.restore()
    miniWindow.show()
    miniWindow.focus()
    return
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  miniWindow = new BrowserWindow({
    width: MINI_DEFAULT_W,
    height: MINI_DEFAULT_H,
    minWidth: MINI_MIN_W,
    minHeight: MINI_MIN_H,
    maxWidth: MINI_MAX_W,
    maxHeight: MINI_MAX_H,
    x: screenWidth - MINI_DEFAULT_W - MINI_MARGIN,
    y: screenHeight - MINI_DEFAULT_H - MINI_MARGIN,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: true,
    resizable: true,
    transparent: true,
    hasShadow: false,
    // With transparent:true on Windows, defer the show until paint is ready,
    // otherwise the window can be created but stay invisible to the user.
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  let shown = false
  const tryShow = (): void => {
    if (shown) return
    if (!miniWindow || miniWindow.isDestroyed()) return
    shown = true
    miniWindow.show()
    miniWindow.focus()
  }

  miniWindow.once('ready-to-show', tryShow)
  // Fallback: if ready-to-show doesn't fire (e.g. transparent window quirk on
  // Windows, slow paint, or load error), force show after a timeout so the
  // user isn't stuck with main hidden and no mini visible.
  setTimeout(tryShow, MINI_SHOW_FALLBACK_MS)

  miniWindow.loadURL(url).catch((e) => {
    console.error('Failed to load pomodoro mini window:', e)
    // Even if loading fails, surface the (likely-blank) window so the user
    // can see something and dismiss it, instead of being stuck.
    tryShow()
  })

  miniWindow.on('closed', () => {
    miniWindow = null
  })
}

export function hidePomodoroMini(): void {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close()
  }
  miniWindow = null
}

export function getPomodoroMini(): BrowserWindow | null {
  return miniWindow && !miniWindow.isDestroyed() ? miniWindow : null
}
