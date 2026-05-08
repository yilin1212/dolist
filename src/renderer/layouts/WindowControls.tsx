import { Minus, Square, X } from 'lucide-react'
import { useTranslation } from '../i18n'

export default function WindowControls() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button
        className="flex h-full w-11 items-center justify-center text-neutral-600 hover:bg-neutral-150"
        aria-label={t('window.minimize')}
        onClick={() => window.electronAPI?.window.minimize()}
      >
        <Minus size={14} />
      </button>
      <button
        className="flex h-full w-11 items-center justify-center text-neutral-600 hover:bg-neutral-150"
        aria-label={t('window.maximize')}
        onClick={() => window.electronAPI?.window.maximize()}
      >
        <Square size={12} />
      </button>
      <button
        className="flex h-full w-11 items-center justify-center text-neutral-600 hover:bg-destructive-500 hover:text-white"
        aria-label={t('window.close')}
        onClick={() => window.electronAPI?.window.close()}
      >
        <X size={14} />
      </button>
    </div>
  )
}
