<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useAppTheme } from './composables/useAppTheme'
import { useI18n } from 'vue-i18n'
import { ar, en, es, fr, hi, zh_cn } from '@nuxt/ui/locale'
import { languageConfig } from './i18n/locales'

const { locale, t } = useI18n()
const language = computed(() => languageConfig.languages.find(item => item.code === locale.value) ?? languageConfig.languages[0])
const uiLocales = { en, 'zh-CN': zh_cn, es, hi, fr, ar }
const uiLocale = computed(() => ({
  ...uiLocales[language.value.code],
  dir: language.value.dir,
  messages: {
    ...uiLocales[language.value.code].messages,
    dashboardSidebar: {
      title: t('navigationTitle'),
      description: t('navigationDescription')
    }
  }
}))
const { colorMode } = useAppTheme()
const themeColor = computed(() => colorMode.value === 'dark' ? '#18181b' : '#ffffff')

useHead(() => ({
  title: 'LZApp',
  htmlAttrs: { lang: language.value.code, dir: language.value.dir },
  meta: [
    { name: 'theme-color', content: themeColor.value },
    { name: 'description', content: t('dashboardDescription') },
    { property: 'og:title', content: 'LZApp' },
    { property: 'og:description', content: t('dashboardDescription') }
  ]
}))
</script>

<template>
  <Suspense>
    <UApp :locale="uiLocale" :toaster="{ label: t('notifications') }">
      <RouterView />
    </UApp>
  </Suspense>
</template>
