<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorContent } from './apiErrors'
import type { ApiErrorContent } from './apiErrors'
import { generateReferralLink, isReferralChannel, referralChannelPattern } from '../composables/referral'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()
const link = ref('')
const channel = ref('')
const validChannel = computed(() => isReferralChannel(channel.value))
const generating = ref(false)
const copying = ref(false)
const error = shallowRef<ApiErrorContent | null>(null)
let requestSequence = 0

watch(open, value => {
  requestSequence += 1
  generating.value = false
  copying.value = false
  if (value) {
    link.value = ''
    error.value = null
    channel.value = ''
  }
})

watch(channel, () => {
  link.value = ''
  error.value = null
})

async function generate() {
  if (generating.value || !validChannel.value) return
  error.value = null
  const sequence = ++requestSequence
  generating.value = true
  link.value = ''
  try {
    const result = await generateReferralLink(channel.value)
    if (sequence === requestSequence) link.value = result
  } catch (reason) {
    if (sequence === requestSequence) error.value = apiErrorContent(reason, t('referralGenerateError'))
  } finally {
    if (sequence === requestSequence) generating.value = false
  }
}

async function copyLink() {
  if (!link.value || copying.value) return
  copying.value = true
  error.value = null
  try {
    await navigator.clipboard.writeText(link.value)
    toast.add({ title: t('referralCopied'), color: 'success' })
  } catch {
    error.value = { description: t('referralCopyError') }
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('referralTitle')">
    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="error.title"
          :description="error.description"
          :ui="{ title: 'whitespace-pre-wrap [overflow-wrap:anywhere]', description: 'whitespace-pre-wrap [overflow-wrap:anywhere]' }"
          role="alert"
        />
        <UFormField
          :label="t('referralChannel')"
          :description="t('referralChannelHelp')"
          :error="channel && !validChannel ? t('referralChannelInvalid') : undefined"
          required
        >
          <UInput
            v-model="channel"
            :disabled="generating"
            :pattern="referralChannelPattern"
            minlength="3"
            maxlength="32"
            required
            autocomplete="off"
            autocapitalize="off"
            :spellcheck="false"
            dir="ltr"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('referralLink')">
          <UTextarea
            :model-value="link"
            :rows="4"
            :disabled="generating"
            readonly
            dir="ltr"
            class="w-full"
            :ui="{ base: 'resize-none font-mono text-xs leading-5 break-all' }"
          />
          <div class="mt-2 flex justify-end">
            <UTooltip :text="t('referralCopy')">
              <UButton
                type="button"
                icon="i-lucide-copy"
                color="neutral"
                variant="soft"
                :loading="copying"
                :disabled="!link || generating"
                :aria-label="t('referralCopy')"
                class="size-8 justify-center"
                @click="copyLink"
              />
            </UTooltip>
          </div>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="open = false">
          {{ t('usersCancel') }}
        </UButton>
        <UButton
          type="button"
          icon="i-lucide-refresh-cw"
          :loading="generating"
          :disabled="!validChannel"
          class="whitespace-normal"
          @click="generate"
        >
          {{ t('referralGenerate') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>