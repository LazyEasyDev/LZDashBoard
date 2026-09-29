<script setup lang="ts">
defineProps<{ error?: string | boolean }>()
</script>

<template>
  <UTooltip
    v-if="typeof error === 'string' && error"
    :text="error"
    :ui="{ content: 'h-auto max-w-xs whitespace-normal' }"
  >
    <span tabindex="0" class="block truncate" aria-live="polite">
      {{ error }}
    </span>
  </UTooltip>
</template>