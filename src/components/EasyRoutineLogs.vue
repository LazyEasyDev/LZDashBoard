<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApiErrorContent } from './apiErrors'
import type { EasyRoutineLog, EasyRoutineRecord } from './easyRoutineRecords'
import { formatRoutineTime, routineStatusColor, routineStatuses, routineStatusKeys } from './easyRoutineRecords'

const props = defineProps<{
  routine: EasyRoutineRecord
  items: EasyRoutineLog[]
  loading: boolean
  error: ApiErrorContent | null
  fetchedAt: number
}>()
const statusFilter = defineModel<string>('statusFilter', { default: '__all__' })
defineEmits<{ retry: [] }>()
const { t, locale } = useI18n()
const toast = useToast()
const search = ref('')
const copyingID = ref('')
const statusOptions = computed(() => [
  { label: t('routineAllStatuses'), value: '__all__' },
  ...[...new Set([...routineStatuses, ...props.items.map(item => item.status)])]
    .map(value => ({ label: statusLabel(value), value }))
])
const filteredLogs = computed(() => {
  const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return props.items.filter(item => {
    if (statusFilter.value !== '__all__' && item.status !== statusFilter.value) return false
    const text = `${item.status} ${item.action} ${item.owner} ${item.log}`.toLowerCase()
    return terms.every(term => text.includes(term))
  })
})
const columns = computed<TableColumn<EasyRoutineLog>[]>(() => [
  { accessorKey: 'created_at', header: t('routineTime') },
  { accessorKey: 'action', header: t('routineAction') },
  { accessorKey: 'status', header: t('routineStatus') },
  { accessorKey: 'log', header: t('routineLog') }
])
const actionKeys: Record<string, string> = { acquire: 'routineAcquire', release: 'routineRelease', renew: 'routineRenew' }

function statusLabel(status: string) {
  return Object.prototype.hasOwnProperty.call(routineStatusKeys, status)
    ? t(routineStatusKeys[status as keyof typeof routineStatusKeys])
    : status
}

function actionLabel(action: string) {
  return Object.prototype.hasOwnProperty.call(actionKeys, action) ? t(actionKeys[action]!) : action
}

async function copyLog(item: EasyRoutineLog) {
  if (copyingID.value) return
  copyingID.value = item.id
  try {
    await navigator.clipboard.writeText(item.log)
    toast.add({ title: t('routineCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('routineCopyError'), color: 'error' })
  } finally {
    copyingID.value = ''
  }
}
</script>

<template>
  <section class="sticky start-0 w-[100cqw] space-y-4 bg-elevated/30 p-4 whitespace-normal sm:p-5" :aria-label="`${t('routineLog')}: ${routine.name}`">
    <dl class="grid grid-cols-1 gap-x-6 gap-y-3 text-xs sm:grid-cols-3">
      <div class="min-w-0">
        <dt class="text-muted">
          {{ t('routineID') }}
        </dt>
        <dd class="mt-1 font-mono text-highlighted [overflow-wrap:anywhere]" dir="ltr">
          {{ routine.routine_id }}
        </dd>
      </div>
      <div class="min-w-0">
        <dt class="text-muted">
          {{ t('routineOwner') }}
        </dt>
        <dd class="mt-1 font-mono text-highlighted [overflow-wrap:anywhere]" dir="ltr">
          {{ routine.owner }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">
          {{ t('routineExpiry') }}
        </dt>
        <dd class="mt-1 text-highlighted">
          {{ formatRoutineTime(routine.expires_at, locale) }}
        </dd>
      </div>
    </dl>

    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        variant="soft"
        :placeholder="t('routineLogSearch')"
        :aria-label="t('routineLogSearch')"
        class="min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-sm"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        :aria-label="t('routineStatus')"
        variant="soft"
        class="w-40"
      />
      <span v-if="fetchedAt" class="text-xs text-muted sm:ms-auto">
        {{ t('routineFetched', { time: formatRoutineTime(fetchedAt, locale) }) }}
      </span>
    </div>

    <div v-if="error" class="flex flex-wrap items-center gap-2">
      <UAlert
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="error.title"
        :description="error.description"
        :ui="{ title: 'whitespace-pre-wrap [overflow-wrap:anywhere]', description: 'whitespace-pre-wrap [overflow-wrap:anywhere]' }"
        role="alert"
        class="min-w-0 flex-1"
      />
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="soft"
        :loading="loading"
        @click="$emit('retry')"
      >
        {{ t('routineRetry') }}
      </UButton>
    </div>

    <UTable
      v-else
      :data="filteredLogs"
      :columns="columns"
      :loading="loading"
      sticky
      class="max-h-96"
      :ui="{ base: 'w-full min-w-3xl', th: 'whitespace-nowrap', td: 'align-top' }"
    >
      <template #created_at-cell="{ row }">
        <time class="text-xs whitespace-nowrap" :datetime="new Date(row.original.created_at * 1000).toISOString()">
          {{ formatRoutineTime(row.original.created_at, locale) }}
        </time>
        <p class="mt-1 max-w-44 truncate font-mono text-xs text-dimmed" :title="row.original.owner" dir="ltr">
          {{ row.original.owner }}
        </p>
      </template>
      <template #action-cell="{ row }">
        <span>{{ actionLabel(row.original.action) }}</span>
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="routineStatusColor(row.original.status)" variant="subtle">
          {{ statusLabel(row.original.status) }}
        </UBadge>
      </template>
      <template #log-cell="{ row }">
        <div class="flex min-w-64 items-start gap-2">
          <pre class="max-h-40 min-w-0 flex-1 overflow-auto font-mono text-xs leading-5 whitespace-pre-wrap text-highlighted [overflow-wrap:anywhere]" dir="ltr">{{ row.original.log || '-' }}</pre>
          <UTooltip :text="t('routineCopyLog')">
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="xs"
              :loading="copyingID === row.original.id"
              :disabled="!row.original.log"
              :aria-label="`${t('routineCopyLog')}: ${formatRoutineTime(row.original.created_at, locale)}`"
              class="size-7 shrink-0 justify-center"
              @click.stop="copyLog(row.original)"
            />
          </UTooltip>
        </div>
      </template>
      <template #empty>
        <span v-if="loading" class="inline-flex items-center gap-2 py-4 text-muted" role="status">
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin motion-reduce:animate-none" />
          {{ t('routineLoading') }}
        </span>
        <p v-else class="py-4 text-sm text-muted">
          {{ t('routineNoLogs') }}
        </p>
      </template>
    </UTable>
    <p v-if="!loading && !error" class="text-xs text-muted" role="status">
      {{ t('routineLogShowing', { count: filteredLogs.length, total: items.length }) }}
    </p>
  </section>
</template>