<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DropdownMenuItem } from '@nuxt/ui'
import { setLanguage } from '../i18n'
import { languageConfig } from '../i18n/locales'
import type { TranslationKey } from '../i18n/locales'
import { useAppTheme } from '../composables/useAppTheme'

withDefaults(defineProps<{ titleKey?: TranslationKey, showSidebar?: boolean, showLogo?: boolean }>(), {
  titleKey: undefined,
  showSidebar: true,
  showLogo: false
})

const { locale, t } = useI18n()
const { themeLabelKey, themeIcon, toggleTheme } = useAppTheme()
const themeLabel = computed(() => t(themeLabelKey.value))
const languages = computed(() => languageConfig.languages.map(language => ({
  label: language.label,
  code: language.code,
  type: 'checkbox' as const,
  checked: language.code === locale.value,
  onSelect: () => setLanguage(language.code)
})) satisfies DropdownMenuItem[])
const currentLanguage = computed(() => languageConfig.languages.find(language => language.code === locale.value) ?? languageConfig.languages[0])
</script>

<template>
  <UDashboardNavbar
    dir="ltr"
    :toggle="showSidebar"
    :ui="{
      root: 'gap-2',
      left: 'min-w-0 flex-1',
      title: 'min-w-0 whitespace-normal break-words text-base leading-tight',
      right: 'ml-auto shrink-0 gap-1 sm:gap-2'
    }"
  >
    <template v-if="showSidebar || showLogo" #leading>
      <UDashboardSidebarCollapse v-if="showSidebar" />
      <RouterLink v-if="showLogo" to="/" class="block shrink-0">
        <img
          :src="'/lzapp-logo.svg'"
          alt="LZApp"
          width="228"
          height="48"
          class="h-auto w-32 sm:w-36"
        >
      </RouterLink>
    </template>

    <template v-if="titleKey" #title>
      <span :dir="currentLanguage.dir">{{ t(titleKey) }}</span>
    </template>

    <template #right>
      <UDropdownMenu
        :items="languages"
        :content="{ align: 'end', sideOffset: 8 }"
        :ui="{ content: 'w-52', item: 'py-2', itemTrailingIcon: 'text-primary' }"
        :modal="false"
      >
        <UButton
          icon="i-lucide-globe"
          trailing-icon="i-lucide-chevron-down"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="`${t('language')}: ${currentLanguage.label}`"
          :title="t('language')"
          class="h-8 w-24 justify-between sm:w-36"
        >
          <span class="sm:hidden">{{ currentLanguage.code.split('-')[0]?.toUpperCase() }}</span>
          <bdi :lang="currentLanguage.code" class="hidden min-w-0 truncate sm:block">{{ currentLanguage.label }}</bdi>
        </UButton>

        <template #item-label="{ item }">
          <bdi :lang="item.code">{{ item.label }}</bdi>
        </template>
      </UDropdownMenu>
      <UTooltip :text="themeLabel">
        <UButton
          :icon="themeIcon"
          color="neutral"
          variant="ghost"
          :aria-label="themeLabel"
          :title="themeLabel"
          class="size-8 justify-center"
          @click="toggleTheme"
        />
      </UTooltip>
    </template>
  </UDashboardNavbar>
</template>