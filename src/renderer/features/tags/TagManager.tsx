import { useEffect, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useTagStore } from './store'
import { PageHeader } from '../../components/ui/page-header'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useTranslation } from '../../i18n'

export default function TagManager() {
  const { t } = useTranslation()
  const { tags, fetchTags, createTag, deleteTag } = useTagStore()
  const [newTagName, setNewTagName] = useState('')

  useEffect(() => { fetchTags() }, [])

  const handleAdd = async () => {
    const name = newTagName.trim()
    if (!name) return
    try {
      await createTag(name)
      setNewTagName('')
    } catch (e) {
      console.error('Failed to create tag:', e)
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title={t('tags.title')} subtitle={t('tags.subtitle')} />

      <div className="mb-4 flex gap-2">
        <Input
          placeholder={t('tags.placeholder')}
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={!newTagName.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          {t('tags.add')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tags.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">{t('tags.empty')}</p>
        ) : (
          <div className="space-y-1">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2.5">
                <span className="text-sm text-neutral-900">{tag.name}</span>
                <button
                  onClick={() => deleteTag(tag.id).catch(() => {})}
                  className="rounded p-1 text-neutral-400 hover:bg-destructive-50 hover:text-destructive-500"
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
