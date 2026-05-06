import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

let miniWindow: BrowserWindow | null = null

export function showPomodoroMini(url: string): void {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show()
    miniWindow.focus()
    return
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  const winWidth = 260
  const winHeight = 130

  miniWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: screenWidth - winWidth - 20,
    y: screenHeight - winHeight - 20,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  miniWindow.loadURL(url)

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
