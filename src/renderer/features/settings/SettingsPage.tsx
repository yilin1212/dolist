import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useTranslation } from '../../i18n'

export default function SettingsPage() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState({
    pomodoro_focus_min: 25,
    pomodoro_short_break_min: 5,
    pomodoro_long_break_min: 15,
    pomodoro_long_break_every: 4,
    workday_start_hour: 9,
    workday_end_hour: 22,
    locale: 'zh-CN',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const keys = Object.keys(settings) as Array<keyof typeof settings>
        const loaded: any = {}
        for (const key of keys) {
          if (key === 'locale') {
            loaded[key] = await window.electronAPI.settings.get(key) || 'zh-CN'
          } else {
            loaded[key] = await window.electronAPI.settings.getInt(key, (settings as any)[key])
          }
        }
        setSettings(loaded)
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    load()
  }, [])

  const saveSetting = async (key: string, value: number | string) => {
    if (typeof value === 'number') {
      await window.electronAPI.settings.setInt(key, value)
    } else {
      await window.electronAPI.settings.set(key, value)
    }
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title={t('settings.title')} />

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Pomodoro settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.pomodoroParams')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('settings.focusDuration')}</label>
                <Input
                  type="number"
                  min={1}
                  value={settings.pomodoro_focus_min}
                  onChange={(e) => saveSetting('pomodoro_focus_min', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('settings.shortBreak')}</label>
                <Input
                  type="number"
                  min={1}
                  value={settings.pomodoro_short_break_min}
                  onChange={(e) => saveSetting('pomodoro_short_break_min', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('settings.longBreak')}</label>
                <Input
                  type="number"
                  min={1}
                  value={settings.pomodoro_long_break_min}
                  onChange={(e) => saveSetting('pomodoro_long_break_min', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('settings.longBreakInterval')}</label>
                <Input
                  type="number"
                  min={1}
                  value={settings.pomodoro_long_break_every}
                  onChange={(e) => saveSetting('pomodoro_long_break_every', Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.workHours')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('settings.startTime')}</label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.workday_start_hour}
                  onChange={(e) => saveSetting('workday_start_hour', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">{t('settings.endTime')}</label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.workday_end_hour}
                  onChange={(e) => saveSetting('workday_end_hour', Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.language')}</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              value={settings.locale}
              onChange={(e) => saveSetting('locale', e.target.value)}
            >
              <option value="zh-CN">中文</option>
              <option value="en">English</option>
            </select>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
