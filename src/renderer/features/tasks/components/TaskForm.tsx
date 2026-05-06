import { useState, useEffect } from 'react'
import { useTaskStore } from '../store'
import type { Task } from '../../../../types/models'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'

interface TaskFormProps {
  open: boolean
  task?: Task | null
  onClose: () => void
}

export default function TaskForm({ open, task, onClose }: TaskFormProps) {
  const { createTask, updateTask } = useTaskStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(2)
  const [estimatedMinutes, setEstimatedMinutes] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description)
      setPriority(task.priority)
      setEstimatedMinutes(task.estimated_minutes)
      setDueDate(task.due_date || '')
      setTagsInput(task.tags?.join(', ') || '')
    } else {
      setTitle('')
      setDescription('')
      setPriority(2)
      setEstimatedMinutes(0)
      setDueDate('')
      setTagsInput('')
    }
  }, [task, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      if (task) {
        await updateTask({
          ...task,
          title: title.trim(),
          description,
          priority,
          estimated_minutes: estimatedMinutes,
          due_date: dueDate || null,
          tags,
        })
      } else {
        await createTask({
          title: title.trim(),
          description,
          priority,
          estimated_minutes: estimatedMinutes,
          due_date: dueDate || null,
          tags,
          status: 'pending',
          list: 'inbox',
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{task ? '编辑任务' : '新建任务'}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                任务标题 <span className="text-destructive-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入任务标题..."
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">描述</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="添加任务描述..."
                rows={3}
              />
            </div>

            {/* Priority & Estimated time row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">优先级</label>
                <select
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                >
                  <option value={1}>低</option>
                  <option value={2}>中</option>
                  <option value={3}>高</option>
                  <option value={4}>紧急</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  预估时间 (分钟)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Due date & Tags row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">截止日期</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">标签</label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="标签1, 标签2..."
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? '保存中...' : task ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
