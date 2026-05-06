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
  private _interval: ReturnType<typeof setInterval> | null = null

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

  pause(): void {
    if (this._state !== PomodoroTimer.STATE_FOCUSING) return
    this._stopInterval()
    this._state = PomodoroTimer.STATE_PAUSED
    this.emit('stateChanged', this._state)
  }

  resume(): void {
    if (this._state !== PomodoroTimer.STATE_PAUSED) return
    this._startInterval()
    this._state = PomodoroTimer.STATE_FOCUSING
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

    if (this._sessionId) {
      this._markSessionStatus(this._sessionId, 'cancelled', elapsedMin)
    }

    const finishedKind = this._kind
    const finishedId = this._sessionId
    this._resetState()
    if (finishedId) this.emit('sessionFinished', { id: finishedId, kind: finishedKind })
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
      if (this._taskId) TaskRepo.addActualMinutes(this._taskId, elapsedMin)
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
    PomodoroRepo.update({
      id: sessionId,
      task_id: this._taskId,
      schedule_block_id: this._blockId,
      started_at: '',
      completed_at: new Date().toISOString(),
      planned_duration_minutes: 0,
      actual_duration_minutes: actualMin,
      session_kind: this._kind,
      status,
    })
  }

  private _resetState(): void {
    this._state = PomodoroTimer.STATE_IDLE
    this._remainingSec = 0
    this._totalSec = 0
    this._sessionId = null
    this._kind = PomodoroTimer.KIND_FOCUS
    this.emit('stateChanged', this._state)
  }
}
