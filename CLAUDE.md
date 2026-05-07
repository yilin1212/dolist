# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Type check | `npm run lint` (runs `tsc --noEmit`) |
| Production build | `npm run build` |
| Package for distribution | `npm run package` |
| Make installer | `npm run make` |

There is no test runner or ESLint/Prettier configured. Type checking is the only validation step.

## Architecture

**Electron + React 18 + TypeScript** desktop app with a three-process model:

### Main Process (`src/main/`)
- **Entry:** `index.ts` — creates BrowserWindow, registers all IPC handlers, initializes DB, creates tray, sets global shortcut (Ctrl+Shift+D)
- **Database:** sql.js (SQLite WASM) with auto-save (500ms debounce after writes). Initialized in `db/client.ts`, schema in `db/utils/migrations.ts`
- **Repositories:** `db/repositories/` — one file per domain (task, category, tag, schedule, pomodoro, settings). All use UUID primary keys
- **IPC handlers:** `ipc/` — one file per domain, each exports a `register*()` function called from `index.ts`
- **Pomodoro timer:** `pomodoro/timer.ts` — EventEmitter-based state machine (idle→focusing→paused→break), runs in main process so it survives renderer restarts
- **Mini window:** `windows/pomodoroMini.ts` — frameless always-on-top BrowserWindow loaded via `#/mini` hash route
- **Scheduler:** `ipc/schedulerIpc.ts` — smart time-slot recommendation algorithm scanning free gaps across 4 days
- **Reminders:** `scheduler/reminderService.ts` — 30s interval checking upcoming schedule blocks + pomodoro finish notifications

### Preload Bridge (`src/preload/index.ts`)
Single file exposing `window.electronAPI` via contextBridge. Domains: window controls, tasks, categories, tags, schedule, pomodoro (with event listeners), settings, scheduler.

### Renderer (`src/renderer/`)
- **Routing:** HashRouter in `app.tsx`. All feature routes nested under `MainLayout`. The `/mini` route renders `PomodoroMini` standalone (outside MainLayout)
- **State:** Zustand stores per feature (`features/*/store.ts`). Each store calls `window.electronAPI.*` methods
- **Components:** `components/ui/` contains 17 shadcn/ui-style primitives built on Radix UI + class-variance-authority + tailwind-merge
- **Styling:** Tailwind CSS 3, `@` alias to `src/renderer`. Semantic colors: neutral scale, primary, success, warning, destructive, priority levels
- **i18n:** React Context in `i18n/index.tsx` with `t()` function. Locales in `i18n/locales/zh-CN.ts` and `en.ts`

## Key Patterns

**Adding a new IPC domain:**
1. Create repository in `src/main/db/repositories/`
2. Create IPC handler in `src/main/ipc/`, export `register*()` function
3. Call it from `src/main/index.ts` in the `app.whenReady()` block
4. Add bridge methods to `src/preload/index.ts`
5. Create renderer Zustand store calling `window.electronAPI.*`

**UI components** use the shadcn/ui pattern: Radix primitive + `cn()` (clsx + tailwind-merge) + class-variance-authority variants. See any file in `components/ui/` for the pattern.

**Path aliases:** `@/` maps to `src/renderer/` in both Vite and TypeScript config.

**Database:** sql.js runs entirely in-memory with periodic export to disk. The `db/client.ts` `getDb()` function returns the live DB instance. Auto-save triggers on every write operation.

**Window:** Frameless (`frame: false`) with custom `WindowControls.tsx` for minimize/maximize/close. Close hides to tray instead of quitting.
