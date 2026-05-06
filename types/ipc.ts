export const IPC_CHANNELS = {
  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // Tasks
  TASK_LIST: 'task:list',
  TASK_GET: 'task:get',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_MARK_DONE: 'task:markDone',
  TASK_MARK_PENDING: 'task:markPending',

  // Categories
  CATEGORY_LIST: 'category:list',
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',

  // Tags
  TAG_LIST: 'tag:list',
  TAG_ENSURE: 'tag:ensure',
  TAG_DELETE: 'tag:delete',

  // Schedule
  SCHEDULE_LIST_BETWEEN: 'schedule:listBetween',
  SCHEDULE_LIST_TODAY: 'schedule:listToday',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_UPDATE: 'schedule:update',
  SCHEDULE_DELETE: 'schedule:delete',
  SCHEDULE_MARK_STATUS: 'schedule:markStatus',

  // Pomodoro
  POMODORO_START_FOCUS: 'pomodoro:startFocus',
  POMODORO_START_BREAK: 'pomodoro:startBreak',
  POMODORO_PAUSE: 'pomodoro:pause',
  POMODORO_RESUME: 'pomodoro:resume',
  POMODORO_STOP: 'pomodoro:stop',
  POMODORO_GET_STATE: 'pomodoro:getState',
  POMODORO_TICK: 'pomodoro:tick',
  POMODORO_STATE_CHANGED: 'pomodoro:stateChanged',
  POMODORO_SESSION_FINISHED: 'pomodoro:sessionFinished',
  POMODORO_SHOW_MINI: 'pomodoro:showMini',
  POMODORO_HIDE_MINI: 'pomodoro:hideMini',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_INT: 'settings:getInt',
  SETTINGS_SET_INT: 'settings:setInt',
  SETTINGS_GET_BOOL: 'settings:getBool',
  SETTINGS_SET_BOOL: 'settings:setBool',

  // Scheduler
  SCHEDULER_RECOMMEND_SLOTS: 'scheduler:recommendSlots',
} as const

export interface TaskFilter {
  status?: string
  category_id?: string
  include_done?: boolean
  search?: string
}
