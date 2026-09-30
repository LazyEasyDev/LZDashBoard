<route lang="json">
{ "name": "not-found", "meta": { "layout": false } }
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

useHead(() => ({
  title: `404 - ${t('notFoundTitle')} | LZApp`,
  meta: [{ name: 'robots', content: 'noindex' }]
}))
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-default">
    <main class="flex flex-1 items-center justify-center px-6 py-16">
      <section class="flex w-full max-w-md flex-col items-center text-center" aria-labelledby="not-found-title">
        <UIcon name="i-lucide-file-question" class="size-12 text-muted" aria-hidden="true" />
        <p class="mt-6 text-7xl leading-none font-semibold text-primary" aria-hidden="true">
          404
        </p>
        <h1 id="not-found-title" class="mt-4 text-2xl font-semibold text-highlighted">
          {{ t('notFoundTitle') }}
        </h1>
        <p class="mt-3 text-base text-muted">
          {{ t('notFoundDescription') }}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <UButton
            to="/"
            icon="i-lucide-house"
            variant="soft"
            size="lg"
          >
            {{ t('notFoundHome') }}
          </UButton>
          <UButton
            to="/user/login"
            icon="i-lucide-log-in"
            color="neutral"
            variant="outline"
            size="lg"
          >
            {{ t('login') }}
          </UButton>
        </div>
      </section>
    </main>
  </div>
</template>