<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { useAppTheme } from '../composables/useAppTheme'
import { useAuth } from '../composables/useAuth'
import { API_ORIGIN } from '../config/api'

const open = ref(false)
const { t } = useI18n()
const { colorMode, themeIcon, toggleTheme } = useAppTheme()
const { user, canViewAdmin } = useAuth()

const accountMenuItems = computed<DropdownMenuItem[][]>(() => [[{
  label: user.value?.email ?? '',
  avatar: { alt: user.value?.email ?? '' },
  type: 'label'
}], [{
  label: t('changePassword'),
  icon: 'i-lucide-key-round',
  to: '/user/reset-password'
}, {
  label: t(colorMode.value === 'dark' ? 'lightMode' : 'darkMode'),
  icon: themeIcon.value,
  onSelect: toggleTheme
}], [{
  label: t('exit'),
  icon: 'i-lucide-log-out',
  color: 'error',
  to: '/settings/exit'
}]])

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
    label: t('apiDocs'),
    icon: 'i-lucide-book-open',
    to: `${API_ORIGIN}/docs`,
    external: true,
    target: '_blank',
    rel: 'noopener noreferrer',
    onSelect: () => {
      open.value = false
    }
  }]
}] satisfies NavigationMenuItem[])
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ header: 'px-2', footer: 'lg:border-t lg:border-default' }"
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

      <template #footer="{ collapsed }">
        <UDropdownMenu
          v-if="user"
          :items="accountMenuItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
          :modal="false"
        >
          <UButton
            :avatar="{ alt: user.email }"
            :label="collapsed ? undefined : user.email"
            :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            :aria-label="user.email"
            class="w-full min-w-0 cursor-pointer overflow-hidden data-[state=open]:bg-elevated"
            :ui="{ trailingIcon: 'text-dimmed ms-auto' }"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <RouterView />
  </UDashboardGroup>
</template>
