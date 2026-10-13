<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ExpandedState, SortingState } from '@tanstack/table-core'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../../components/AppNavbar.vue'
import EasyStatisticsRecords from '../../components/EasyStatisticsRecords.vue'
import { apiErrorContent } from '../../components/apiErrors'
import type { ApiErrorContent } from '../../components/apiErrors'
import type { StatisticsBatchCount, StatisticsDefinition, StatisticsListSnapshot } from '../../components/easyStatisticsRecords'
import { filterStatistics, formatStatisticsDuration, formatStatisticsTime } from '../../components/easyStatisticsRecords'
import { apiRequest } from '../../composables/useAuth'

const { t, locale } = useI18n()
const items = ref<StatisticsDefinition[]>([])
const search = ref('')
const expanded = ref<ExpandedState>({})
const sorting = ref<SortingState>([{ id: 'name', desc: false }])
const loading = ref(false)
const batchesLoading = ref(false)
const loadError = ref<ApiErrorContent | null>(null)
const batchesError = ref<ApiErrorContent | null>(null)
const batchCount = ref<number | null>(null)
const fetchedAt = ref(0)
const maxQueryBuckets = ref(500)
const filteredItems = computed(() => filterStatistics(items.value, search.value))
const columns = computed<TableColumn<StatisticsDefinition>[]>(() => [
  { id: 'expand', size: 48, enableSorting: false },
  { accessorKey: 'name', header: t('statisticsName') },
  { accessorKey: 'fields', header: t('statisticsFields'), enableSorting: false },
  { id: 'dimensions', header: t('statisticsDimensions'), enableSorting: false },
  { accessorKey: 'update_interval', header: t('statisticsUpdateInterval') }
])
let listVersion = 0
let batchesVersion = 0

async function loadDefinitions() {
  if (loading.value) return
  const version = ++listVersion
  loading.value = true
  loadError.value = null
  expanded.value = {}
  try {
    const response = await apiRequest<StatisticsListSnapshot>('/admin/easystatistics/list')
    if (version !== listVersion) return
    items.value = response.items
    maxQueryBuckets.value = response.max_query_buckets
    fetchedAt.value = response.fetched_at
  } catch (failure) {
    if (version === listVersion) loadError.value = apiErrorContent(failure, t('statisticsLoadError'))
  } finally {
    if (version === listVersion) loading.value = false
  }
}

async function loadBatches() {
  if (batchesLoading.value) return
  const version = ++batchesVersion
  batchesLoading.value = true
  batchesError.value = null
  try {
    const response = await apiRequest<StatisticsBatchCount>('/admin/easystatistics/batches')
    if (version === batchesVersion) batchCount.value = response.count
  } catch (failure) {
    if (version === batchesVersion) {
      batchCount.value = null
      batchesError.value = apiErrorContent(failure, t('statisticsBatchLoadError'))
    }
  } finally {
    if (version === batchesVersion) batchesLoading.value = false
  }
}

async function refresh() {
  await Promise.all([loadDefinitions(), loadBatches()])
}

function toggleRow(event: Event, row: TableRow<StatisticsDefinition>) {
  if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return
  row.toggleExpanded()
}

onMounted(refresh)
onBeforeUnmount(() => {
  listVersion += 1
  batchesVersion += 1
})
</script>

<template>
  <UDashboardPanel id="easystatistics">
    <template #header>
      <AppNavbar title-key="easyStatistics" />
    </template>
    <template #body>
      <div class="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        <UAlert
          v-if="loadError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="loadError.title"
          :description="loadError.description"
          :ui="{ title: 'whitespace-pre-wrap [overflow-wrap:anywhere]', description: 'whitespace-pre-wrap [overflow-wrap:anywhere]' }"
          role="alert"
        />
        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            variant="soft"
            :placeholder="t('statisticsSearch')"
            :aria-label="t('statisticsSearch')"
            class="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto sm:max-w-sm"
          />
          <UTooltip :text="t('statisticsRefresh')">
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              :loading="loading || batchesLoading"
              :aria-label="t('statisticsRefresh')"
              class="size-8 shrink-0 justify-center"
              @click="refresh"
            />
          </UTooltip>
          <UBadge color="neutral" variant="subtle">
            {{ t('statisticsRegisteredCount', { count: items.length }) }}
          </UBadge>
          <UBadge color="neutral" variant="subtle" role="status">
            <UIcon v-if="batchesLoading" name="i-lucide-loader-circle" class="size-3.5 animate-spin motion-reduce:animate-none" />
            {{ batchCount === null ? t('statisticsBatchUnavailable') : t('statisticsBatchCount', { count: new Intl.NumberFormat(locale).format(batchCount) }) }}
          </UBadge>
          <UBadge color="neutral" variant="subtle">
            {{ t('usersReadOnly') }}
          </UBadge>
          <span v-if="fetchedAt" class="text-xs text-muted sm:ms-auto">{{ t('statisticsFetched', { time: formatStatisticsTime(new Date(fetchedAt * 1000).toISOString(), locale) }) }}</span>
        </div>
        <div v-if="batchesError" class="flex items-start gap-2">
          <UAlert
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="batchesError.title"
            :description="batchesError.description"
            :ui="{ title: 'whitespace-pre-wrap [overflow-wrap:anywhere]', description: 'whitespace-pre-wrap [overflow-wrap:anywhere]' }"
            role="alert"
            class="min-w-0 flex-1"
          />
          <UTooltip :text="t('statisticsRefreshBatches')">
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              :loading="batchesLoading"
              :aria-label="t('statisticsRefreshBatches')"
              class="size-8 shrink-0 justify-center"
              @click="loadBatches"
            />
          </UTooltip>
        </div>
        <UTable
          v-model:expanded="expanded"
          v-model:sorting="sorting"
          :data="filteredItems"
          :columns="columns"
          :get-row-id="statistic => `statistics:${statistic.name}`"
          :loading="loading"
          sticky
          class="@container max-h-[70vh] rounded-md border border-default"
          :ui="{ base: 'w-full min-w-3xl', th: 'whitespace-nowrap', td: 'align-top has-[>section]:p-0', tr: 'data-[expanded=true]:bg-elevated/30' }"
          @select="toggleRow"
        >
          <template v-for="columnID in ['name', 'update_interval']" :key="columnID" #[`${columnID}-header`]="{ column }">
            <UButton
              color="neutral"
              variant="ghost"
              :label="String(column.columnDef.header)"
              :icon="column.getIsSorted() ? (column.getIsSorted() === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down'"
              class="-ms-2.5 whitespace-nowrap"
              @click="column.toggleSorting(column.getIsSorted() === 'asc')"
            />
          </template>
          <template #expand-cell="{ row }">
            <UTooltip :text="t(row.getIsExpanded() ? 'statisticsCollapse' : 'statisticsExpand')">
              <UButton
                :icon="row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                color="neutral"
                variant="ghost"
                :aria-label="`${t(row.getIsExpanded() ? 'statisticsCollapse' : 'statisticsExpand')}: ${row.original.name}`"
                :aria-expanded="row.getIsExpanded()"
                class="size-8 justify-center"
                @click.stop="row.toggleExpanded()"
              />
            </UTooltip>
          </template>
          <template #name-cell="{ row }">
            <span class="block min-w-40 max-w-64 font-mono text-sm font-medium whitespace-pre-wrap text-highlighted [overflow-wrap:anywhere]" dir="auto">{{ row.original.name }}</span>
          </template>
          <template #fields-cell="{ row }">
            <div class="flex max-w-64 flex-wrap gap-1">
              <UBadge
                v-for="field in row.original.fields"
                :key="field"
                color="neutral"
                variant="subtle"
                class="max-w-full font-mono whitespace-normal [overflow-wrap:anywhere]"
              >
                {{ field }}
              </UBadge>
            </div>
          </template>
          <template #dimensions-cell="{ row }">
            <div class="min-w-48 max-w-80 space-y-1 text-xs">
              <div v-for="(value, index) in row.original.dimensions" :key="index" class="flex items-start justify-between gap-3">
                <p class="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
                  <span class="font-mono text-highlighted">{{ value.order_fields.join(', ') }}</span>
                  <span class="ms-2 text-muted">{{ value.group_intervals.join(' / ') }}</span>
                </p>
                <span class="shrink-0 text-muted tabular-nums whitespace-nowrap">{{ t('statisticsRowCount', { count: new Intl.NumberFormat(locale).format(value.count) }) }}</span>
              </div>
            </div>
          </template>
          <template #update_interval-cell="{ row }">
            <span class="text-sm whitespace-nowrap text-muted">{{ formatStatisticsDuration(row.original.update_interval, locale) }}</span>
          </template>
          <template #expanded="{ row }">
            <EasyStatisticsRecords :statistic="row.original" :max-query-buckets="maxQueryBuckets" />
          </template>
          <template #empty>
            <p class="py-8 text-center text-sm text-muted">
              {{ t('statisticsNoDefinitions') }}
            </p>
          </template>
        </UTable>
      </div>
    </template>
  </UDashboardPanel>
</template>