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

export interface Task {
  id: string
  title: string
  description: string
  category_id: string | null
  priority: number // 1=low, 2=normal, 3=high, 4=urgent
  status: string // pending | doing | done | cancelled
  estimated_minutes: number
  actual_minutes: number
  due_date: string | null
  created_at: string
  completed_at: string | null
  repeat_type: string
  repeat_data: string
  parent_task_id: string | null
  list: string // 'inbox' | 'today' | project_id
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
  status: string // pending | done | skipped
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
  session_kind: string // focus | short_break | long_break
  status: string // running | completed | cancelled
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string
  sort_order: number
  created_at: string
}

export const PRIORITY_LABELS: Record<number, { zh: string; en: string }> = {
  1: { zh: '低', en: 'Low' },
  2: { zh: '中', en: 'Normal' },
  3: { zh: '高', en: 'High' },
  4: { zh: '紧急', en: 'Urgent' },
}

export const TASK_STATUS_LABELS: Record<string, { zh: string; en: string }> = {
  pending: { zh: '待办', en: 'Pending' },
  doing: { zh: '进行中', en: 'In Progress' },
  done: { zh: '已完成', en: 'Done' },
  cancelled: { zh: '已取消', en: 'Cancelled' },
}

export const DEFAULT_CATEGORIES = [
  { name: '工作', name_en: 'Work', color: '#4F8EF7' },
  { name: '学习', name_en: 'Study', color: '#7BC67E' },
  { name: '生活', name_en: 'Life', color: '#F5A623' },
  { name: '其他', name_en: 'Other', color: '#9B9B9B' },
]
