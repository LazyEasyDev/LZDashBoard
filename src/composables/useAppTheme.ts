import { computed } from 'vue'
import { createSharedComposable, useColorMode } from '@vueuse/core'

export const useAppTheme = createSharedComposable(() => {
  const colorMode = useColorMode()
  const themeLabelKey = computed(() => colorMode.value === 'dark' ? 'switchToLight' : 'switchToDark')
  const themeIcon = computed(() => colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon')

  function toggleTheme() {
    colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
  }

  return { colorMode, themeLabelKey, themeIcon, toggleTheme }
})