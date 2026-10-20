<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useAppTheme } from './composables/useAppTheme'
import { useI18n } from 'vue-i18n'
import { ar, en, es, fr, hi, zh_cn } from '@nuxt/ui/locale'
import { languageConfig } from './i18n/locales'

const { locale, t } = useI18n()
const route = useRoute()
const isAuthPage = computed(() => route.meta.layout === 'auth')
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
const themeColor = computed(() => colorMode.value === 'dark' ? '#0a0a0a' : '#ffffff')

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
    <UApp
      :locale="uiLocale"
      :toaster="{
        label: t('notifications'),
        ...(isAuthPage ? {
          position: 'top-center',
          ui: { viewport: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:w-[28rem] lg:w-lg' }
        } : {})
      }"
    >
      <RouterView />
    </UApp>
  </Suspense>
</template>
