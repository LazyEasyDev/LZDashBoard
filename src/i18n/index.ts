import { createI18n } from 'vue-i18n'
import { isLanguageCode, languageConfig, messages } from './locales'

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(languageConfig.storageKey)
    return isLanguageCode(saved) ? saved : languageConfig.defaultLanguage
  } catch {
    return languageConfig.defaultLanguage
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: getSavedLanguage(),
  fallbackLocale: languageConfig.defaultLanguage,
  messages
})

export function setLanguage(value: string) {
  if (!isLanguageCode(value)) return

  i18n.global.locale.value = value

  try {
    localStorage.setItem(languageConfig.storageKey, value)
  } catch {
    return
  }
}