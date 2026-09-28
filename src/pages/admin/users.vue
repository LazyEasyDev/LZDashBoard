<script setup lang="ts">
import AppNavbar from '../../components/AppNavbar.vue'
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <AppNavbar title-key="users" />
    </template>

    <template #body>
      <div class="min-h-0 flex-1" />
    </template>
  </UDashboardPanel>
</template>