<script setup lang="ts">
import AppNavbar from '../components/AppNavbar.vue'
</script>

<template>
  <div class="min-h-dvh w-full bg-default">
    <AppNavbar :show-sidebar="false" show-logo />
    <main class="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 sm:py-14 lg:max-w-[76.8rem] lg:pt-20">
      <div class="overflow-hidden rounded-lg border-5 border-solid border-[#f1f1f2] bg-elevated/60 shadow-xl shadow-black/20 lg:flex lg:rtl:flex-row-reverse dark:border-[#1b1b1e] dark:bg-zinc-950/60 dark:shadow-2xl dark:shadow-black/60">
        <div class="relative hidden min-h-[36rem] lg:block lg:w-1/2" aria-hidden="true">
          <img
            src="/userbg.svg"
            alt=""
            width="768"
            height="768"
            class="absolute inset-0 m-auto h-auto w-[calc(100%-4rem)] max-h-[calc(100%-4rem)] scale-80 object-contain dark:opacity-30"
          >
        </div>
        <div class="relative min-w-0 bg-white px-5 pt-20 pb-5 sm:px-6 sm:pt-16 sm:pb-10 lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-10 dark:bg-transparent">
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>