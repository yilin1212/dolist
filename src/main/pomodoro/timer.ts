import { EventEmitter } from 'events'
import { PomodoroRepo, SettingsRepo, TaskRepo } from '../db/repositories'

export class PomodoroTimer extends EventEmitter {
  static STATE_IDLE = 'idle'
  static STATE_FOCUSING = 'focusing'
  static STATE_PAUSED = 'paused'
  static STATE_BREAK = 'break'

  static KIND_FOCUS = 'focus'
  static KIND_SHORT_BREAK = 'short_break'
  static KIND_LONG_BREAK = 'long_break'

  private _state = PomodoroTimer.STATE_IDLE
  private _remainingSec = 0
  private _totalSec = 0
  private _sessionId: string | null = null
  private _taskId: string | null = null
  private _blockId: string | null = null
  private _kind = PomodoroTimer.KIND_FOCUS
  private _completedFocusCount = 0
  private _promotedTaskToDoing = false
  private _interval: ReturnType<typeof setInterval> | null = null

  constructor() {
    super()
    // Reconstruct completed focus count from DB so long-break logic survives restarts
    try {
      const sessions = PomodoroRepo.listBetween(
        new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        new Date().toISOString()
      )
      this._completedFocusCount = sessions.filter(
        (s) => s.session_kind === 'focus' && s.status === 'completed'
      ).length
    } catch { /* start from 0 if query fails */ }
  }

  get state() { return this._state }
  get remainingSec() { return this._remainingSec }
  get totalSec() { return this._totalSec }
  get taskId() { return this._taskId }
  get kind() { return this._kind }
  get completedFocusCount() { return this._completedFocusCount }

  startFocus(focusMinutes: number, taskId?: string, blockId?: string): boolean {
    if (this._state !== PomodoroTimer.STATE_IDLE) return false
    focusMinutes = Math.max(1, Math.floor(focusMinutes))
    this._taskId = taskId || null
    this._blockId = blockId || null
    this._kind = PomodoroTimer.KIND_FOCUS
    this._totalSec = focusMinutes * 60
    this._remainingSec = this._totalSec

    this._sessionId = PomodoroRepo.create({
      task_id: taskId || null,
      schedule_block_id: blockId || null,
      planned_duration_minutes: focusMinutes,
      session_kind: PomodoroTimer.KIND_FOCUS,
      status: 'running',
    })

    // Move the focused task into the 'doing' kanban column while focus is active
    this._promotedTaskToDoing = false
    if (taskId) {
      const task = TaskRepo.get(taskId)
      if (task && task.status === 'pending') {
        TaskRepo.update({ ...task, status: 'doing' })
        this._promotedTaskToDoing = true
      }
    }

    this._state = PomodoroTimer.STATE_FOCUSING
    this._startInterval()
    this.emit('stateChanged', this._state)
    this.emit('tick', this._remainingSec, this._totalSec)
    return true
  }

  startBreak(kind = PomodoroTimer.KIND_SHORT_BREAK): boolean {
    if (this._state !== PomodoroTimer.STATE_IDLE) return false
    const minutes = kind === PomodoroTimer.KIND_LONG_BREAK
      ? SettingsRepo.getInt('pomodoro_long_break_min', 15)
      : SettingsRepo.getInt('pomodoro_short_break_min', 5)
    const clamped = Math.max(1, minutes)
    this._taskId = null
    this._blockId = null
    this._kind = kind
    this._totalSec = clamped * 60
    this._remainingSec = this._totalSec

    this._sessionId = PomodoroRepo.create({
      planned_duration_minutes: clamped,
      session_kind: kind,
      status: 'running',
    })

    this._state = PomodoroTimer.STATE_BREAK
    this._startInterval()
    this.emit('stateChanged', this._state)
    this.emit('tick', this._remainingSec, this._totalSec)
    return true
  }

  private _pausedFrom = PomodoroTimer.STATE_FOCUSING

  pause(): void {
    if (this._state !== PomodoroTimer.STATE_FOCUSING && this._state !== PomodoroTimer.STATE_BREAK) return
    this._pausedFrom = this._state
    this._stopInterval()
    this._state = PomodoroTimer.STATE_PAUSED
    this.emit('stateChanged', this._state)
  }

  resume(): void {
    if (this._state !== PomodoroTimer.STATE_PAUSED) return
    this._startInterval()
    this._state = this._pausedFrom
    this.emit('stateChanged', this._state)
  }

  stop(): void {
    if (this._state === PomodoroTimer.STATE_IDLE) return
    this._stopInterval()
    const elapsedSec = this._totalSec - this._remainingSec
    const elapsedMin = Math.max(0, Math.floor(elapsedSec / 60))

    if (this._kind === PomodoroTimer.KIND_FOCUS && this._taskId && elapsedMin > 0) {
      TaskRepo.addActualMinutes(this._taskId, elapsedMin)
    }

    // Revert task back to pending only if this timer promoted it to 'doing'
    if (this._kind === PomodoroTimer.KIND_FOCUS && this._taskId && this._promotedTaskToDoing) {
      const task = TaskRepo.get(this._taskId)
      if (task && task.status === 'doing') {
        TaskRepo.update({ ...task, status: 'pending' })
      }
    }

    if (this._sessionId) {
      this._markSessionStatus(this._sessionId, 'cancelled', elapsedMin)
    }

    const finishedKind = this._kind
    const finishedId = this._sessionId
    this._resetState()
    if (finishedId) this.emit('sessionCancelled', { id: finishedId, kind: finishedKind })
  }

  private _startInterval(): void {
    this._interval = setInterval(() => this._onTick(), 1000)
  }

  private _stopInterval(): void {
    if (this._interval) {
      clearInterval(this._interval)
      this._interval = null
    }
  }

  private _onTick(): void {
    this._remainingSec -= 1
    if (this._remainingSec <= 0) {
      this._onFinished()
      return
    }
    this.emit('tick', this._remainingSec, this._totalSec)
  }

  private _onFinished(): void {
    this._stopInterval()
    const elapsedMin = Math.floor(this._totalSec / 60)

    if (this._kind === PomodoroTimer.KIND_FOCUS) {
      if (this._taskId) {
        TaskRepo.addActualMinutes(this._taskId, elapsedMin)
        // Move task back out of 'doing' only if this timer promoted it
        if (this._promotedTaskToDoing) {
          const task = TaskRepo.get(this._taskId)
          if (task && task.status === 'doing') {
            TaskRepo.update({ ...task, status: 'pending' })
          }
        }
      }
      this._completedFocusCount++
    }

    if (this._sessionId) {
      this._markSessionStatus(this._sessionId, 'completed', elapsedMin)
    }

    const finishedKind = this._kind
    const finishedId = this._sessionId
    this._resetState()
    if (finishedId) this.emit('sessionFinished', { id: finishedId, kind: finishedKind })
  }

  private _markSessionStatus(sessionId: string, status: string, actualMin: number): void {
    PomodoroRepo.updatePartial(sessionId, {
      task_id: this._taskId,
      schedule_block_id: this._blockId,
      completed_at: new Date().toISOString(),
      actual_duration_minutes: actualMin,
      status,
    })
  }

  private _resetState(): void {
    this._state = PomodoroTimer.STATE_IDLE
    this._remainingSec = 0
    this._totalSec = 0
    this._sessionId = null
    this._taskId = null
    this._blockId = null
    this._kind = PomodoroTimer.KIND_FOCUS
    this.emit('stateChanged', this._state)
  }
}
