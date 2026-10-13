<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { SortingState } from '@tanstack/table-core'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiRequest } from '../composables/useAuth'
import { apiErrorContent } from './apiErrors'
import type { ApiErrorContent } from './apiErrors'
import StatisticsTimeInput from './StatisticsTimeInput.vue'
import type { StatisticsDefinition, StatisticsInterval, StatisticsQueryInput, StatisticsRecord, StatisticsRecordsSnapshot } from './easyStatisticsRecords'
import { currentStatisticsBucket, formatStatisticsDuration, formatStatisticsTime } from './easyStatisticsRecords'

const props = defineProps<{ statistic: StatisticsDefinition, maxQueryBuckets: number }>()
const { t, locale } = useI18n()
const dimensionIndex = ref('0')
const interval = ref<StatisticsInterval>('DAY')
const fieldValues = ref<string[]>([])
const start = ref('')
const end = ref('')
const items = ref<StatisticsRecord[]>([])
const loading = ref(false)
const queried = ref(false)
const error = ref<ApiErrorContent | null>(null)
const fetchedAt = ref(0)
const pagination = ref({ pageIndex: 0, pageSize: 20 })
const sorting = ref<SortingState>([{ id: 'grouped_time', desc: false }])
const paginationOptions = { getPaginationRowModel: getPaginationRowModel() }
const dimension = computed(() => props.statistic.dimensions[Number(dimensionIndex.value)])
const dimensionOptions = computed(() => props.statistic.dimensions.map((value, index) => ({ label: value.order_fields.join(', '), value: String(index) })))
const intervalKeys = { DAY: 'statisticsDay', WEEK: 'statisticsWeek', MONTH: 'statisticsMonth', YEAR: 'statisticsYear', FOREVER: 'statisticsForever' }
const intervalOptions = computed(() => (dimension.value?.group_intervals ?? []).map(value => ({ label: t(intervalKeys[value]), value })))
const rangeReversed = computed(() => interval.value !== 'FOREVER' && !!start.value && !!end.value && (interval.value === 'YEAR' ? Number(end.value) < Number(start.value) : end.value < start.value))
const canQuery = computed(() => !!dimension.value && !loading.value && (interval.value === 'FOREVER' || !!start.value && !!end.value && !rangeReversed.value))
const firstVisible = computed(() => items.value.length ? pagination.value.pageIndex * pagination.value.pageSize + 1 : 0)
const lastVisible = computed(() => Math.min((pagination.value.pageIndex + 1) * pagination.value.pageSize, items.value.length))
const columns = computed<TableColumn<StatisticsRecord>[]>(() => [
  { accessorKey: 'grouped_time', header: t('statisticsBucket') },
  ...(dimension.value?.order_fields ?? []).map((field, index) => ({ id: `field_${index}`, header: field, accessorFn: (record: StatisticsRecord) => record.order_fields[index]?.value ?? '' })),
  { accessorKey: 'counter', header: t('statisticsCounter') },
  { accessorKey: 'last_update_time', header: t('statisticsUpdated') }
])
let requestVersion = 0

function clearResults() {
  requestVersion += 1
  items.value = []
  error.value = null
  queried.value = false
  fetchedAt.value = 0
  pagination.value = { ...pagination.value, pageIndex: 0 }
  loading.value = false
}

async function queryRecords() {
  if (!canQuery.value || !dimension.value) return
  const version = ++requestVersion
  const input: StatisticsQueryInput = {
    name: props.statistic.name,
    fields: dimension.value.order_fields.map((name, index) => ({ name, value: fieldValues.value[index] ?? '' })),
    group_interval: interval.value
  }
  if (interval.value !== 'FOREVER') {
    input.start = String(start.value)
    input.end = String(end.value)
  }
  loading.value = true
  error.value = null
  queried.value = true
  items.value = []
  pagination.value = { ...pagination.value, pageIndex: 0 }
  try {
    const response = await apiRequest<StatisticsRecordsSnapshot>('/admin/easystatistics/query', input)
    if (version !== requestVersion) return
    items.value = response.items
    fetchedAt.value = response.fetched_at
  } catch (failure) {
    if (version === requestVersion) error.value = apiErrorContent(failure, t('statisticsQueryError'))
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

watch(dimensionIndex, () => {
  fieldValues.value = (dimension.value?.order_fields ?? []).map(() => '')
  interval.value = dimension.value?.group_intervals[0] ?? 'DAY'
  clearResults()
}, { immediate: true })
watch(interval, value => {
  start.value = currentStatisticsBucket(value)
  end.value = start.value
  clearResults()
}, { immediate: true })
onBeforeUnmount(() => { requestVersion += 1 })
</script>

<template>
  <section class="sticky start-0 w-[100cqw] space-y-4 bg-elevated/30 p-4 whitespace-normal sm:p-5" :aria-label="t('statisticsRecordsTitle', { name: statistic.name })" @click.stop>
    <form class="space-y-4" @submit.prevent="queryRecords">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <UFormField :label="t('statisticsDimension')" class="min-w-0">
          <USelect
            v-model="dimensionIndex"
            :items="dimensionOptions"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('statisticsInterval')" class="min-w-0">
          <USelect
            v-model="interval"
            :items="intervalOptions"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>
        <template v-if="interval !== 'FOREVER'">
          <UFormField :label="t('statisticsStart')" required class="min-w-0">
            <StatisticsTimeInput
              v-model="start"
              :interval="interval"
              :label="t('statisticsStart')"
              :disabled="loading"
            />
          </UFormField>
          <UFormField
            :label="t('statisticsEnd')"
            :error="rangeReversed ? t('statisticsRangeOrder') : undefined"
            required
            class="min-w-0"
          >
            <StatisticsTimeInput
              v-model="end"
              :interval="interval"
              :label="t('statisticsEnd')"
              :disabled="loading"
              :min="start"
            />
          </UFormField>
        </template>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <UFormField
          v-for="(field, index) in dimension?.order_fields ?? []"
          :key="`${dimensionIndex}:${field}`"
          :label="field"
          class="min-w-0"
        >
          <UInput
            v-model="fieldValues[index]"
            :disabled="loading"
            :spellcheck="false"
            autocomplete="off"
            class="w-full"
            :ui="{ base: 'font-mono' }"
          />
        </UFormField>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <UButton
          type="submit"
          variant="soft"
          icon="i-lucide-search"
          :loading="loading"
          :disabled="!canQuery"
        >
          {{ t('statisticsQuery') }}
        </UButton>
        <span class="text-xs text-muted">{{ t('statisticsBucketLimit', { count: maxQueryBuckets }) }}</span>
        <span v-if="dimension" class="text-xs text-muted">
          {{ t('statisticsRetention') }}: {{ dimension.clear_after ? formatStatisticsDuration(dimension.clear_after, locale) : t('statisticsNoExpiry') }}
        </span>
        <span v-if="fetchedAt" class="text-xs text-muted sm:ms-auto">
          {{ t('statisticsFetched', { time: formatStatisticsTime(new Date(fetchedAt * 1000).toISOString(), locale) }) }}
        </span>
      </div>
    </form>

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
    <template v-else-if="queried">
      <UTable
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        :data="items"
        :columns="columns"
        :get-row-id="record => record.grouped_time"
        :pagination-options="paginationOptions"
        :loading="loading"
        sticky
        class="max-h-96"
        :ui="{ base: 'w-full min-w-2xl', th: 'whitespace-nowrap', td: 'align-top' }"
      >
        <template v-for="columnID in ['grouped_time', 'counter', 'last_update_time']" :key="columnID" #[`${columnID}-header`]="{ column }">
          <UButton
            color="neutral"
            variant="ghost"
            :label="String(column.columnDef.header)"
            :icon="column.getIsSorted() ? (column.getIsSorted() === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down'"
            class="-ms-2.5 whitespace-nowrap"
            @click="column.toggleSorting(column.getIsSorted() === 'asc')"
          />
        </template>
        <template #grouped_time-cell="{ row }">
          <span class="font-mono text-xs whitespace-nowrap" dir="ltr">{{ row.original.grouped_time }}</span>
        </template>
        <template v-for="(_, index) in dimension?.order_fields ?? []" :key="index" #[`field_${index}-cell`]="{ row }">
          <span class="block min-w-32 max-w-64 font-mono text-xs whitespace-pre-wrap [overflow-wrap:anywhere]" dir="auto">{{ row.original.order_fields[index]?.value || t('statisticsEmptyValue') }}</span>
        </template>
        <template #counter-cell="{ row }">
          <span class="font-medium tabular-nums" :class="row.original.counter < 0 ? 'text-error' : 'text-highlighted'">{{ new Intl.NumberFormat(locale).format(row.original.counter) }}</span>
        </template>
        <template #last_update_time-cell="{ row }">
          <time class="text-xs whitespace-nowrap text-muted" :datetime="row.original.last_update_time">{{ formatStatisticsTime(row.original.last_update_time, locale) }}</time>
        </template>
        <template #empty>
          <span v-if="loading" class="inline-flex items-center gap-2 py-4 text-muted" role="status">
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin motion-reduce:animate-none" />
            {{ t('statisticsLoading') }}
          </span>
          <p v-else class="py-4 text-sm text-muted">
            {{ t('statisticsNoRecords') }}
          </p>
        </template>
      </UTable>
      <div v-if="!loading" class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-muted" role="status">
          {{ t('statisticsShowing', { from: firstVisible, to: lastVisible, total: items.length }) }}
        </p>
        <UPagination
          :page="pagination.pageIndex + 1"
          variant="ghost"
          active-variant="soft"
          :total="items.length"
          :items-per-page="pagination.pageSize"
          :sibling-count="1"
          @update:page="pagination = { ...pagination, pageIndex: $event - 1 }"
        />
      </div>
    </template>
  </section>
</template>