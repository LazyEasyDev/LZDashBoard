<script setup lang="ts">
import AppNavbar from '../../components/AppNavbar.vue'
</script>

<template>
  <UDashboardPanel id="change-password">
    <template #header>
      <AppNavbar title-key="changePassword" />
    </template>

    <template #body>
      <div class="min-h-0 flex-1" />
    </template>
  </UDashboardPanel>
</template>