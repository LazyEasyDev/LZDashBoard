<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../../components/AppNavbar.vue'
import { useAuth } from '../../composables/useAuth'

const { logout } = useAuth()
const router = useRouter()
const { t } = useI18n()

onMounted(async () => {
  let failed = false
  try {
    await logout()
  } catch {
    failed = true
  }
  await router.replace({ path: '/user/login', query: failed ? { logout: 'failed' } : {} })
})
</script>

<template>
  <UDashboardPanel id="exit">
    <template #header>
      <AppNavbar title-key="exit" />
    </template>

    <template #body>
      <div class="flex items-center gap-2 text-muted" role="status">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        {{ t('logoutPending') }}
      </div>
    </template>
  </UDashboardPanel>
</template>