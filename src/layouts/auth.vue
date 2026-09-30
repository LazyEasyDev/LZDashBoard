<script setup lang="ts">
import AppNavbar from '../components/AppNavbar.vue'
</script>

<template>
  <div class="flex min-h-dvh w-full items-center bg-zinc-300 dark:bg-default">
    <main class="mx-auto w-full max-w-lg px-4 py-8 sm:px-6 sm:py-12 lg:max-w-[70rem]">
      <div class="overflow-hidden rounded-lg border-10 border-solid border-[#f1f1f2]/40 bg-elevated/60 bg-clip-padding shadow-xl shadow-black/20 lg:flex lg:rtl:flex-row-reverse dark:border-[#1b1b1e]/40 dark:bg-zinc-950/60 dark:shadow-2xl dark:shadow-black/60">
        <div class="relative hidden bg-zinc-50 lg:block lg:w-[44%] dark:bg-[#121214]" aria-hidden="true">
          <img
            src="/userbg.svg"
            alt=""
            width="768"
            height="768"
            class="absolute inset-0 m-auto h-auto w-[calc(100%-4rem)] max-h-[calc(100%-4rem)] scale-80 object-contain dark:opacity-65"
          >
        </div>
        <div class="relative flex min-w-0 flex-col gap-12 bg-white px-5 pt-4 pb-14 sm:px-6 sm:pt-8 lg:w-[56%] lg:px-10 dark:bg-transparent">
          <AppNavbar :show-sidebar="false" show-logo embedded />
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>