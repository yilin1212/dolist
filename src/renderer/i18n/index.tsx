import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { zhCN } from './locales/zh-CN'
import { en } from './locales/en'

type Locale = 'zh-CN' | 'en'
type Translations = typeof zhCN

const locales: Record<Locale, Translations> = { 'zh-CN': zhCN, en: en as Translations }

interface I18nContextType {
  locale: Locale
  t: (key: string) => string
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nContextType>({
  locale: 'zh-CN',
  t: (key) => key,
  setLocale: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh-CN')

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await window.electronAPI?.settings.get('locale')
        if (saved === 'en' || saved === 'zh-CN') setLocaleState(saved)
      } catch {}
    }
    load()
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    window.electronAPI?.settings.set('locale', newLocale)
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = locales[locale]
    for (const k of keys) {
      value = value?.[k]
    }
    return typeof value === 'string' ? value : key
  }

  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  return useContext(I18nContext)
}
