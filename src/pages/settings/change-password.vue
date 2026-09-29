<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppNavbar from '../../components/AppNavbar.vue'

const { t } = useI18n()
</script>

<template>
  <UDashboardPanel id="change-password">
    <template #header>
      <AppNavbar title-key="changePassword" />
    </template>

    <template #body>
      <div>
        <UButton
          to="/user/reset-password"
          icon="i-lucide-key-round"
          variant="soft"
          class="max-w-full cursor-pointer justify-center whitespace-normal"
        >
          {{ t('resetPassword') }}
        </UButton>
      </div>
    </template>
  </UDashboardPanel>
</template>