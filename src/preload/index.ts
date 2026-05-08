import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Task, Category, ScheduleBlock } from '../../types/models'
import type { TaskFilter } from '../../types/ipc'

const electronAPI = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    show: () => ipcRenderer.send('window:show'),
    hide: () => ipcRenderer.send('window:hide'),
  },
  tasks: {
    list: (filters?: TaskFilter) => ipcRenderer.invoke('task:list', filters),
    get: (id: string) => ipcRenderer.invoke('task:get', id),
    create: (task: Partial<Task>) => ipcRenderer.invoke('task:create', task),
    update: (task: Task) => ipcRenderer.invoke('task:update', task),
    delete: (id: string) => ipcRenderer.invoke('task:delete', id),
    markDone: (id: string) => ipcRenderer.invoke('task:markDone', id),
    markPending: (id: string) => ipcRenderer.invoke('task:markPending', id),
  },
  categories: {
    list: () => ipcRenderer.invoke('category:list'),
    create: (name: string, color: string) => ipcRenderer.invoke('category:create', name, color),
    update: (category: Partial<Category>) => ipcRenderer.invoke('category:update', category),
    delete: (id: string) => ipcRenderer.invoke('category:delete', id),
  },
  tags: {
    list: () => ipcRenderer.invoke('tag:list'),
    ensure: (name: string) => ipcRenderer.invoke('tag:ensure', name),
    delete: (id: string) => ipcRenderer.invoke('tag:delete', id),
  },
  schedule: {
    listBetween: (start: string, end: string) => ipcRenderer.invoke('schedule:listBetween', start, end),
    listToday: () => ipcRenderer.invoke('schedule:listToday'),
    listByTask: (taskId: string) => ipcRenderer.invoke('schedule:listByTask', taskId),
    create: (block: Partial<ScheduleBlock>) => ipcRenderer.invoke('schedule:create', block),
    update: (block: ScheduleBlock) => ipcRenderer.invoke('schedule:update', block),
    delete: (id: string) => ipcRenderer.invoke('schedule:delete', id),
    markStatus: (id: string, status: string) => ipcRenderer.invoke('schedule:markStatus', id, status),
  },
  pomodoro: {
    startFocus: (minutes: number, taskId?: string, blockId?: string) =>
      ipcRenderer.invoke('pomodoro:startFocus', minutes, taskId, blockId),
    startBreak: (kind: string) => ipcRenderer.invoke('pomodoro:startBreak', kind),
    pause: () => ipcRenderer.invoke('pomodoro:pause'),
    resume: () => ipcRenderer.invoke('pomodoro:resume'),
    stop: () => ipcRenderer.invoke('pomodoro:stop'),
    getState: () => ipcRenderer.invoke('pomodoro:getState'),
    onTick: (callback: (data: { remaining: number; total: number }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { remaining: number; total: number }) => callback(data)
      ipcRenderer.on('pomodoro:tick', handler)
      return () => ipcRenderer.removeListener('pomodoro:tick', handler)
    },
    onStateChanged: (callback: (state: string) => void) => {
      const handler = (_event: IpcRendererEvent, state: string) => callback(state)
      ipcRenderer.on('pomodoro:stateChanged', handler)
      return () => ipcRenderer.removeListener('pomodoro:stateChanged', handler)
    },
    onSessionFinished: (callback: (data: { id: string; kind: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { id: string; kind: string }) => callback(data)
      ipcRenderer.on('pomodoro:sessionFinished', handler)
      return () => ipcRenderer.removeListener('pomodoro:sessionFinished', handler)
    },
    onSessionCancelled: (callback: (data: { id: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { id: string }) => callback(data)
      ipcRenderer.on('pomodoro:sessionCancelled', handler)
      return () => ipcRenderer.removeListener('pomodoro:sessionCancelled', handler)
    },
    showMini: () => ipcRenderer.invoke('pomodoro:showMini'),
    hideMini: () => ipcRenderer.invoke('pomodoro:hideMini'),
    setMiniBounds: (width: number, height: number) => ipcRenderer.invoke('pomodoro:setMiniBounds', width, height),
    listBetween: (start: string, end: string) => ipcRenderer.invoke('pomodoro:listBetween', start, end),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getInt: (key: string, defaultVal?: number) => ipcRenderer.invoke('settings:getInt', key, defaultVal),
    setInt: (key: string, value: number) => ipcRenderer.invoke('settings:setInt', key, value),
    getBool: (key: string, defaultVal?: boolean) => ipcRenderer.invoke('settings:getBool', key, defaultVal),
    setBool: (key: string, value: boolean) => ipcRenderer.invoke('settings:setBool', key, value),
  },
  scheduler: {
    recommendSlots: (durationMinutes: number, numPieces?: number, maxOptions?: number) =>
      ipcRenderer.invoke('scheduler:recommendSlots', durationMinutes, numPieces, maxOptions),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
