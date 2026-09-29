<script setup lang="ts">
import { computed, onMounted, reactive, ref, useTemplateRef, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AuthErrorHint from './AuthErrorHint.vue'
import { createAuthSchemas } from './authSchema'
import { authErrorKey } from './authErrors'
import { apiRequest, safeLocalRedirect, useAuth } from '../composables/useAuth'
import type { SessionUser } from '../composables/useAuth'
import type { TranslationKey } from '../i18n/locales'

const props = defineProps<{ mode: 'login' | 'register' | 'reset' }>()
const { locale, t } = useI18n()
const router = useRouter()
const route = useRoute()
const { user, setUser, logout } = useAuth()
const form = useTemplateRef('form')
const state = reactive({
  name: '',
  email: user.value?.email ?? '',
  password: '',
  confirmation: '',
  email_code: '',
  captcha: ''
})
const isLogin = computed(() => props.mode === 'login')
const titleKey = computed(() => props.mode === 'reset' ? 'resetPassword' : props.mode)
const schemas = computed(() => createAuthSchemas(props.mode, t))
const fieldUI = {
  root: 'grid grid-cols-[fit-content(55%)_minmax(0,1fr)] items-start gap-x-2',
  wrapper: 'col-start-1 row-start-1 min-w-0',
  container: 'contents',
  error: 'col-start-2 row-start-1 mt-0 h-5 min-w-0 text-xs leading-5'
}
const captchaId = ref('')
const captchaImage = ref('')
const captchaLoading = ref(false)
const captchaError = ref(false)
const submitting = ref(false)
const sendingCode = ref(false)
const retryingLogout = ref(false)
const busy = computed(() => submitting.value || sendingCode.value || retryingLogout.value)
const errorKey = ref<TranslationKey | ''>('')
const emailCodeSent = ref(false)
const errorMessage = computed(() => errorKey.value ? t(errorKey.value) : '')
const showPassword = ref(false)
const now = useNow({ interval: 1000 })
const cooldownUntil = ref(0)
const cooldown = computed(() => Math.max(0, Math.ceil((cooldownUntil.value - now.value.getTime()) / 1000)))
const redirect = computed(() => safeLocalRedirect(route.query.redirect))
const redirectQuery = computed(() => redirect.value === '/' ? {} : { redirect: redirect.value })
let captchaRequest = 0

watch(locale, () => {
  if (form.value?.getErrors().length) {
    void form.value.validate({ silent: true })
  }
}, { flush: 'post' })

async function refreshCaptcha() {
  const request = ++captchaRequest
  captchaLoading.value = true
  captchaError.value = false
  captchaId.value = ''
  captchaImage.value = ''
  state.captcha = ''
  try {
    const result = await apiRequest<{ captcha_id: string, image: string }>('/user/captcha')
    if (!result.captcha_id || !result.image.startsWith('data:image/png;base64,')) throw new Error()
    if (request !== captchaRequest) return
    captchaId.value = result.captcha_id
    captchaImage.value = result.image
  } catch {
    if (request === captchaRequest) captchaError.value = true
  } finally {
    if (request === captchaRequest) captchaLoading.value = false
  }
}

function captchaImageFailed() {
  captchaError.value = true
  captchaId.value = ''
  captchaImage.value = ''
}

async function sendEmailCode() {
  if (busy.value || cooldown.value || !captchaId.value || captchaLoading.value) return
  errorKey.value = ''
  emailCodeSent.value = false
  const validated = schemas.value.emailCode.safeParse({ email: state.email, captcha: state.captcha })
  if (!validated.success) {
    form.value?.setErrors(validated.error.issues.map(issue => ({ name: issue.path.join('.'), message: issue.message })))
    return
  }
  form.value?.clear()
  sendingCode.value = true
  try {
    await apiRequest<{ message: string }>('/user/email_code', {
      ...validated.data,
      purpose: props.mode === 'register' ? 'register' : 'reset_password',
      captcha_id: captchaId.value
    })
    now.value = new Date()
    cooldownUntil.value = now.value.getTime() + 30_000
    emailCodeSent.value = true
  } catch (error) {
    errorKey.value = authErrorKey(error)
  } finally {
    await refreshCaptcha()
    sendingCode.value = false
  }
}

async function submit() {
  if (busy.value || !captchaId.value || captchaLoading.value) return
  submitting.value = true
  errorKey.value = ''
  emailCodeSent.value = false
  let destination: string | undefined
  const body = {
    email: state.email.trim(),
    password: state.password,
    captcha_id: captchaId.value,
    captcha: state.captcha.trim()
  }
  try {
    if (props.mode === 'reset') {
      await apiRequest<{ message: string }>('/user/reset_password', { ...body, email_code: state.email_code.trim() })
      setUser(null)
      destination = '/user/login?reset=success'
    } else {
      const result = await apiRequest<SessionUser>(`/user/${props.mode}`, props.mode === 'register'
        ? { ...body, ...(state.name.trim() ? { name: state.name.trim() } : {}), email_code: state.email_code.trim() }
        : body)
      setUser(result)
      destination = redirect.value
    }
    state.password = ''
    state.confirmation = ''
    state.email_code = ''
  } catch (error) {
    errorKey.value = authErrorKey(error)
  } finally {
    await refreshCaptcha()
    submitting.value = false
  }
  if (destination) await router.replace(destination)
}

async function retryLogout() {
  retryingLogout.value = true
  errorKey.value = ''
  try {
    await logout()
    await router.replace('/user/login')
  } catch (error) {
    errorKey.value = authErrorKey(error)
  } finally {
    retryingLogout.value = false
  }
}

onMounted(refreshCaptcha)
</script>

<template>
  <section class="min-w-0 space-y-6">
    <h1 class="absolute top-0 right-0 m-0 max-w-full text-right text-lg leading-6 font-medium text-dimmed/50 [overflow-wrap:anywhere]" dir="auto">
      <span class="inline-block max-w-full rounded-bl-lg bg-black/[0.03] px-4 py-2 uppercase dark:bg-white/5">
        {{ t(titleKey) }}
      </span>
    </h1>

    <UAlert
      v-if="isLogin && route.query.reset === 'success'"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      :description="t('resetSuccess')"
      role="status"
    />
    <UAlert
      v-if="isLogin && route.query.session === 'unavailable'"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :description="t('sessionUnavailable')"
    />
    <div v-if="isLogin && route.query.logout === 'failed'" class="space-y-3">
      <UAlert
        color="warning"
        variant="subtle"
        :description="t('logoutFailed')"
        role="alert"
      />
      <UButton
        icon="i-lucide-log-out"
        color="neutral"
        variant="outline"
        :loading="retryingLogout"
        :disabled="busy"
        @click="retryLogout"
      >
        {{ t('retryLogout') }}
      </UButton>
    </div>
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
      role="alert"
    />
    <UAlert
      v-if="emailCodeSent"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      :description="t('emailCodeSent')"
      role="status"
    />

    <UForm
      ref="form"
      :schema="schemas.form"
      :state="state"
      class="space-y-5"
      @submit="submit"
    >
      <UFormField
        v-if="mode === 'register'"
        :label="t('name')"
        name="name"
        :ui="fieldUI"
      >
        <div class="col-span-2 row-start-2 mt-1 min-w-0 w-full">
          <UInput
            v-model="state.name"
            :placeholder="t('namePlaceholder')"
            autocomplete="name"
            :disabled="busy"
            class="w-full"
          />
        </div>
        <template #error="{ error }">
          <AuthErrorHint :error="error" />
        </template>
      </UFormField>
      <UFormField
        :label="t('email')"
        name="email"
        :ui="fieldUI"
        required
      >
        <div class="col-span-2 row-start-2 mt-1 min-w-0 w-full">
          <UInput
            v-model.trim="state.email"
            :placeholder="t('emailPlaceholder')"
            type="email"
            autocomplete="username"
            :spellcheck="false"
            :disabled="busy"
            class="w-full"
          />
        </div>
        <template #error="{ error }">
          <AuthErrorHint :error="error" />
        </template>
      </UFormField>
      <UFormField
        :label="t(mode === 'reset' ? 'newPassword' : 'password')"
        name="password"
        :ui="fieldUI"
        required
      >
        <div class="col-span-2 row-start-2 mt-1 min-w-0 w-full">
          <UInput
            v-model="state.password"
            :placeholder="t(isLogin ? 'passwordPlaceholder' : 'newPasswordPlaceholder')"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="isLogin ? 'current-password' : 'new-password'"
            :disabled="busy"
            class="w-full"
          >
            <template #trailing>
              <UTooltip :text="t(showPassword ? 'hidePassword' : 'showPassword')">
                <UButton
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="t(showPassword ? 'hidePassword' : 'showPassword')"
                  :aria-pressed="showPassword"
                  color="neutral"
                  variant="link"
                  size="sm"
                  type="button"
                  @click="showPassword = !showPassword"
                />
              </UTooltip>
            </template>
          </UInput>
        </div>
        <template #error="{ error }">
          <AuthErrorHint :error="error" />
        </template>
      </UFormField>
      <UFormField
        v-if="!isLogin"
        :label="t(mode === 'reset' ? 'confirmNewPassword' : 'confirmPassword')"
        name="confirmation"
        :ui="fieldUI"
        required
      >
        <div class="col-span-2 row-start-2 mt-1 min-w-0 w-full">
          <UInput
            v-model="state.confirmation"
            :placeholder="t('confirmPasswordPlaceholder')"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :disabled="busy"
            class="w-full"
          />
        </div>
        <template #error="{ error }">
          <AuthErrorHint :error="error" />
        </template>
      </UFormField>

      <UFormField
        :label="t('captcha')"
        name="captcha"
        :ui="fieldUI"
        required
      >
        <div class="col-span-2 row-start-2 mt-1 min-w-0 w-full space-y-3">
          <div class="grid grid-cols-[minmax(0,1fr)_6rem_2rem] items-center gap-2">
            <UInput
              v-model="state.captcha"
              :placeholder="t('captchaPlaceholder')"
              :aria-label="t('captcha')"
              :ui="{ base: 'font-mono' }"
              inputmode="numeric"
              autocomplete="off"
              autocapitalize="off"
              :maxlength="6"
              :spellcheck="false"
              :disabled="busy || captchaLoading || !captchaId"
              class="min-w-0 w-full"
            />
            <div class="flex h-8 aspect-[3/1] shrink-0 items-center justify-center overflow-hidden rounded-md border border-default bg-transparent" :aria-busy="captchaLoading">
              <img
                v-if="captchaImage"
                :src="captchaImage"
                :alt="t('captchaImage')"
                class="h-full w-full object-contain"
                @error="captchaImageFailed"
              >
              <UIcon v-else-if="captchaLoading" name="i-lucide-loader-circle" class="size-5 animate-spin text-zinc-500" />
              <UIcon v-else name="i-lucide-image-off" class="size-5 text-zinc-500" />
            </div>
            <UTooltip :text="t('refreshCaptcha')">
              <UButton
                icon="i-lucide-refresh-cw"
                :aria-label="t('refreshCaptcha')"
                :loading="captchaLoading"
                :disabled="busy || captchaLoading"
                type="button"
                color="neutral"
                variant="ghost"
                class="size-8 shrink-0 cursor-pointer justify-center"
                @click="refreshCaptcha"
              />
            </UTooltip>
          </div>
          <p v-if="captchaError" class="text-sm text-error" role="alert">
            {{ t('captchaUnavailable') }}
          </p>
        </div>
        <template #error="{ error }">
          <AuthErrorHint :error="error" />
        </template>
      </UFormField>

      <UFormField
        v-if="!isLogin"
        :label="t('emailCode')"
        name="email_code"
        :ui="fieldUI"
        required
      >
        <div class="col-span-2 row-start-2 mt-1 grid min-w-0 w-full grid-cols-[minmax(0,1fr)_6rem_2rem] items-center gap-2">
          <UInput
            v-model.trim="state.email_code"
            :placeholder="t('emailCodePlaceholder')"
            :ui="{ base: 'font-mono' }"
            inputmode="numeric"
            :maxlength="6"
            autocomplete="one-time-code"
            :disabled="busy"
            class="min-w-0 w-full"
          />
          <UButton
            :icon="cooldown > 0 ? undefined : 'i-lucide-mail'"
            type="button"
            color="neutral"
            variant="soft"
            :loading="sendingCode"
            :disabled="busy || cooldown > 0 || captchaLoading || !captchaId"
            class="col-span-2 min-h-8 min-w-0 w-full cursor-pointer justify-center whitespace-normal"
            @click="sendEmailCode"
          >
            {{ cooldown > 0 ? t('resendEmailCode', { seconds: cooldown }) : t('sendEmailCode') }}
          </UButton>
        </div>
        <template #error="{ error }">
          <AuthErrorHint :error="error" />
        </template>
      </UFormField>

      <UButton
        type="submit"
        variant="soft"
        block
        :loading="submitting"
        :disabled="busy || captchaLoading || !captchaId"
        :icon="isLogin ? 'i-lucide-log-in' : mode === 'register' ? 'i-lucide-user-plus' : 'i-lucide-key-round'"
        class="max-w-full cursor-pointer justify-center whitespace-normal"
      >
        {{ t(titleKey) }}
      </UButton>
    </UForm>

    <nav class="flex flex-wrap justify-between gap-x-4 gap-y-3 text-sm">
      <ULink v-if="!isLogin" :to="{ path: '/user/login', query: redirectQuery }" class="text-primary">
        {{ t('backToLogin') }}
      </ULink>
      <ULink v-if="isLogin" :to="{ path: '/user/register', query: redirectQuery }" class="text-primary">
        {{ t('register') }}
      </ULink>
      <ULink v-if="isLogin" :to="{ path: '/user/reset-password', query: redirectQuery }" class="text-primary">
        {{ t('forgotPassword') }}
      </ULink>
    </nav>
  </section>
</template>