import { memo, useState, useEffect } from 'react'
import { useTaskStore } from '../store'
import type { Task } from '../../../../types/models'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Select } from '../../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { useTranslation } from '../../../i18n'

interface TaskFormProps {
  open: boolean
  task?: Task | null
  defaultList?: string
  onClose: () => void
}

function todayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default memo(function TaskForm({ open, task, defaultList, onClose }: TaskFormProps) {
  const { t } = useTranslation()
  const { createTask, updateTask } = useTaskStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(2)
  const [estimatedMinutes, setEstimatedMinutes] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState('')
  const [formError, setFormError] = useState('')

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
      setDueDate(defaultList === 'today' ? todayString() : '')
      setTagsInput('')
    }
  }, [task, open, defaultList])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError(t('tasks.titleRequired'))
      return
    }

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
          list: defaultList || 'inbox',
        })
      }
      onClose()
    } catch (e) {
      console.error('Failed to save task:', e)
      setFormError(t('common.save') + ' failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{task ? t('common.edit') + t('tasks.title') : t('tasks.newTask')}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                {t('tasks.title')} <span className="text-destructive-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(''); setFormError('') }}
                placeholder={t('tasks.titlePlaceholder')}
                autoFocus
                required
                aria-invalid={!!titleError}
                aria-describedby={titleError ? 'title-error' : undefined}
                className={titleError ? 'border-destructive-500 focus-visible:ring-destructive-500/30' : ''}
              />
              {titleError && <p id="title-error" className="mt-1 text-xs text-destructive-500" role="alert">{titleError}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('tasks.description')}</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('tasks.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            {/* Priority & Estimated time row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('tasks.priority')}</label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                >
                  <option value={1}>{t('tasks.priorityLabel.low')}</option>
                  <option value={2}>{t('tasks.priorityLabel.normal')}</option>
                  <option value={3}>{t('tasks.priorityLabel.high')}</option>
                  <option value={4}>{t('tasks.priorityLabel.urgent')}</option>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  {t('tasks.estimatedTime')}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>

            {/* Due date & Tags row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('tasks.dueDate')}</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('tasks.tags')}</label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder={t('tasks.tagsPlaceholder')}
                />
              </div>
            </div>
          </div>

          {formError && <p className="mt-2 text-sm text-destructive-500" role="alert">{formError}</p>}
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? t('common.saving') : task ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})
