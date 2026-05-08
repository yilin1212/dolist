export interface Category {
  id: string
  name: string
  color: string
  sort_order: number
}

export interface Tag {
  id: string
  name: string
}

export type TaskPriority = 1 | 2 | 3 | 4
export type TaskStatus = 'pending' | 'doing' | 'done' | 'cancelled'
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly'
export type ScheduleBlockStatus = 'pending' | 'done' | 'skipped'
export type PomodoroSessionKind = 'focus' | 'short_break' | 'long_break'
export type PomodoroSessionStatus = 'running' | 'completed' | 'cancelled'

export interface Task {
  id: string
  title: string
  description: string
  category_id: string | null
  priority: TaskPriority
  status: TaskStatus
  estimated_minutes: number
  actual_minutes: number
  due_date: string | null
  created_at: string
  completed_at: string | null
  repeat_type: RepeatType
  repeat_data: string
  parent_task_id: string | null
  list: string
  is_favorited: number
  sort_order: number
  reminder_at: string | null
  tags: string[]
}

export interface ScheduleBlock {
  id: string
  task_id: string
  start_time: string
  end_time: string
  status: ScheduleBlockStatus
  created_at: string
}

export interface PomodoroSession {
  id: string
  task_id: string | null
  schedule_block_id: string | null
  started_at: string
  completed_at: string | null
  planned_duration_minutes: number
  actual_duration_minutes: number | null
  session_kind: PomodoroSessionKind
  status: PomodoroSessionStatus
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string
  sort_order: number
  created_at: string
}

