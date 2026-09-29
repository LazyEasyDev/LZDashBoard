<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useAppTheme } from '../composables/useAppTheme'
import { useAuth } from '../composables/useAuth'
import { API_ORIGIN } from '../config/api'

const open = ref(false)
const isWideScreen = useMediaQuery('(min-width: 1536px)')
const sidebarId = computed(() => isWideScreen.value ? 'default-wide' : 'default')
const { t } = useI18n()
const { colorMode, themeIcon, toggleTheme } = useAppTheme()
const { canViewAdmin } = useAuth()

const links = computed(() => [{
  label: t('home'),
  icon: 'i-lucide-house',
  to: '/',
  exact: true,
  onSelect: () => {
    open.value = false
  }
}, ...(canViewAdmin.value ? [{
  label: t('admin'),
  icon: 'i-lucide-folder',
  defaultOpen: true,
  type: 'trigger' as const,
  children: [{
    label: t('users'),
    icon: 'i-lucide-users',
    to: '/admin/users',
    onSelect: () => {
      open.value = false
    }
  }]
}] : []), {
  label: t('settings'),
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: t('changePassword'),
    icon: 'i-lucide-key-round',
    to: '/settings/change-password',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t('apiDocs'),
    icon: 'i-lucide-book-open',
    to: `${API_ORIGIN}/docs`,
    external: true,
    target: '_blank',
    rel: 'noopener noreferrer',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: t(colorMode.value === 'dark' ? 'lightMode' : 'darkMode'),
    icon: themeIcon.value,
    onSelect: () => {
      toggleTheme()
      open.value = false
    }
  }, {
    label: t('exit'),
    icon: 'i-lucide-log-out',
    to: '/settings/exit',
    onSelect: () => {
      open.value = false
    }
  }]
}] satisfies NavigationMenuItem[])
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar
      :id="sidebarId"
      :key="sidebarId"
      v-model:open="open"
      :default-size="isWideScreen ? 20 : 15"
      :max-size="20"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ header: 'px-2' }"
    >
      <template #header="{ collapsed }">
        <UTooltip text="LZApp" :disabled="!collapsed">
          <UButton
            to="/"
            color="neutral"
            variant="ghost"
            class="h-12 min-w-0 flex-1 justify-start rounded-md py-1.5"
            :class="collapsed ? 'px-2' : 'mx-2 px-2.5'"
            :aria-label="t('brandHome')"
            @click="open = false"
          >
            <img
              :src="collapsed ? '/logo.svg' : '/lzapp-logo.svg'"
              alt=""
              :width="collapsed ? 32 : 144"
              :height="collapsed ? 32 : 30"
              class="block max-w-full object-contain object-left"
              :class="collapsed ? 'size-8 shrink-0' : 'h-auto w-36'"
            >
          </UButton>
        </UTooltip>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          :ui="{ linkLabel: 'whitespace-normal', childLinkLabel: 'whitespace-normal' }"
          orientation="vertical"
          tooltip
          popover
        />
      </template>
    </UDashboardSidebar>

    <RouterView />
  </UDashboardGroup>
</template>
