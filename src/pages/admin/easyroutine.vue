<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { ExpandedState, SortingState } from '@tanstack/table-core'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../../components/AppNavbar.vue'
import EasyRoutineLogs from '../../components/EasyRoutineLogs.vue'
import { apiErrorContent } from '../../components/apiErrors'
import type { ApiErrorContent } from '../../components/apiErrors'
import type { EasyRoutineLog, EasyRoutineRecord, RoutineSnapshot } from '../../components/easyRoutineRecords'
import { filterRoutines, formatRoutineTime, routineStatusColor, routineStatuses, routineStatusKeys } from '../../components/easyRoutineRecords'
import { apiRequest, useAuth } from '../../composables/useAuth'

interface LogCache {
  items: EasyRoutineLog[]
  loading: boolean
  loaded: boolean
  error: ApiErrorContent | null
  fetchedAt: number
}

const { t, locale } = useI18n()
const { canManageUsers: canManageRoutines } = useAuth()
const toast = useToast()
const records = ref<EasyRoutineRecord[]>([])
const search = ref('')
const statusFilter = ref('__all__')
const hasPanic = ref(false)
const appliedSearch = ref('')
const appliedStatus = ref('__all__')
const appliedHasPanic = ref(false)
const loading = ref(false)
const loadError = ref<ApiErrorContent | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<EasyRoutineRecord | null>(null)
const deleteConfirmation = ref('')
const deleting = ref(false)
const deleteError = ref<ApiErrorContent | null>(null)
const fetchedAt = ref(0)
const expanded = ref<ExpandedState>({})
const logCache = reactive<Record<string, LogCache>>({})
const logFilters = reactive<Record<string, string>>({})
const pagination = ref({ pageIndex: 0, pageSize: 20 })
const paginationOptions = { getPaginationRowModel: getPaginationRowModel() }
const sorting = ref<SortingState>([{ id: 'history', desc: true }, { id: 'name', desc: false }])
const pageSizeOptions = [10, 20, 50].map(value => ({ label: String(value), value }))
const sortableColumns = ['name', 'status', 'history', 'success_count', 'failure_count', 'latest_panic_at', 'updated_at']
let requestVersion = 0

const deleteConfirmed = computed(() => !!deleteTarget.value && deleteConfirmation.value === deleteTarget.value.name)
const filteredRecords = computed(() => filterRoutines(records.value, appliedSearch.value, appliedStatus.value === '__all__' ? '' : appliedStatus.value, appliedHasPanic.value))
const statusOptions = computed(() => [
  { label: t('routineAllStatuses'), value: '__all__' },
  ...[...new Set([...routineStatuses, ...records.value.map(record => record.status)])]
    .map(value => ({ label: statusLabel(value), value }))
])
const lastPage = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pagination.value.pageSize)))
const firstVisible = computed(() => filteredRecords.value.length ? pagination.value.pageIndex * pagination.value.pageSize + 1 : 0)
const lastVisible = computed(() => Math.min((pagination.value.pageIndex + 1) * pagination.value.pageSize, filteredRecords.value.length))
const columns = computed<TableColumn<EasyRoutineRecord>[]>(() => {
  const result: TableColumn<EasyRoutineRecord>[] = [
    { id: 'expand', size: 48, enableSorting: false },
    { accessorKey: 'name', header: t('routineName'), enableSorting: true },
    { accessorKey: 'status', header: t('routineStatus'), enableSorting: true },
    { id: 'history', accessorFn: record => record.log_counts.panic, header: t('routineHistory'), enableSorting: true },
    { accessorKey: 'success_count', header: t('routineSuccesses'), enableSorting: true },
    { accessorKey: 'failure_count', header: t('routineFailures'), enableSorting: true },
    { accessorKey: 'latest_panic_at', header: t('routineLatestPanic'), enableSorting: true },
    { accessorKey: 'updated_at', header: t('routineUpdated'), enableSorting: true }
  ]
  if (canManageRoutines.value) result.push({ id: 'actions', header: t('routineActions'), size: 64, enableSorting: false })
  return result
})

function statusLabel(status: string) {
  return Object.prototype.hasOwnProperty.call(routineStatusKeys, status)
    ? t(routineStatusKeys[status as keyof typeof routineStatusKeys])
    : status
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(locale.value).format(value)
}

async function loadRoutines() {
  if (loading.value) return
  const version = ++requestVersion
  loading.value = true
  loadError.value = null
  expanded.value = {}
  for (const id of Object.keys(logCache)) delete logCache[id]
  for (const id of Object.keys(logFilters)) delete logFilters[id]
  try {
    const response = await apiRequest<RoutineSnapshot<EasyRoutineRecord>>('/admin/easyroutine/list')
    if (version !== requestVersion) return
    records.value = response.items
    fetchedAt.value = response.fetched_at
  } catch (error) {
    if (version === requestVersion) loadError.value = apiErrorContent(error, t('routineLoadError'))
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

async function loadLogs(routineID: string, retry = false) {
  const cached = logCache[routineID]
  if (cached?.loading || cached?.loaded && !retry) return
  logCache[routineID] ??= { items: [], loading: false, loaded: false, error: null, fetchedAt: 0 }
  const state = logCache[routineID]
  const version = requestVersion
  state.loading = true
  state.error = null
  try {
    const query = new URLSearchParams({ routine_id: routineID })
    const response = await apiRequest<RoutineSnapshot<EasyRoutineLog>>(`/admin/easyroutine/logs?${query}`)
    if (version !== requestVersion) return
    state.items = response.items
    state.fetchedAt = response.fetched_at
    state.loaded = true
  } catch (error) {
    if (version === requestVersion) state.error = apiErrorContent(error, t('routineLogsError'))
  } finally {
    if (version === requestVersion) state.loading = false
  }
}

async function searchRoutines() {
  if (loading.value || deleting.value) return
  appliedSearch.value = search.value.trim()
  appliedStatus.value = statusFilter.value
  appliedHasPanic.value = hasPanic.value
  pagination.value.pageIndex = 0
  await loadRoutines()
}

function openStatusLogs(row: TableRow<EasyRoutineRecord>, status: string) {
  logFilters[row.id] = status
  row.toggleExpanded(true)
}

function toggleRow(event: Event, row: TableRow<EasyRoutineRecord>) {
  if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return
  row.toggleExpanded()
}

function confirmDelete(record: EasyRoutineRecord) {
  if (!canManageRoutines.value || deleting.value || loading.value) return
  deleteTarget.value = record
  deleteConfirmation.value = ''
  deleteError.value = null
  deleteOpen.value = true
}

async function deleteRoutine() {
  if (!canManageRoutines.value || deleting.value || !deleteTarget.value || !deleteConfirmed.value) return
  const target = deleteTarget.value
  deleting.value = true
  deleteError.value = null
  try {
    await apiRequest<{ message: string }>('/admin/easyroutine/delete', { name: target.name })
    records.value = records.value.filter(record => record.routine_id !== target.routine_id)
    deleteOpen.value = false
    toast.add({ title: t('routineDeleted'), color: 'success' })
    await loadRoutines()
  } catch (error) {
    deleteError.value = apiErrorContent(error, t('routineDeleteError'))
  } finally {
    deleting.value = false
  }
}

watch(expanded, value => {
  const ids = value === true ? records.value.map(record => record.routine_id) : Object.keys(value).filter(id => value[id])
  for (const id of ids) {
    logFilters[id] ??= '__all__'
    void loadLogs(id)
  }
}, { deep: true })
watch(() => pagination.value.pageSize, () => {
  pagination.value.pageIndex = 0
  void loadRoutines()
})
watch(lastPage, () => { pagination.value.pageIndex = Math.min(pagination.value.pageIndex, lastPage.value - 1) })
onMounted(loadRoutines)
onBeforeUnmount(() => { requestVersion += 1 })
</script>

<template>
  <UDashboardPanel id="easyroutine">
    <template #header>
      <AppNavbar title-key="easyRoutine" />
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

        <form class="flex flex-wrap items-center gap-3" @submit.prevent="searchRoutines">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            variant="soft"
            :placeholder="t('routineSearch')"
            :aria-label="t('routineSearch')"
            class="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto sm:max-w-sm"
          />
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            :aria-label="t('routineStatus')"
            variant="soft"
            class="w-44"
          />
          <UCheckbox v-model="hasPanic" :label="t('routineHasPanic')" />
          <UButton
            type="submit"
            icon="i-lucide-search"
            color="primary"
            variant="soft"
            :loading="loading"
            :disabled="deleting"
          >
            {{ t('usersSearch') }}
          </UButton>
          <UBadge v-if="!canManageRoutines" color="neutral" variant="subtle">
            {{ t('usersReadOnly') }}
          </UBadge>
          <span v-if="fetchedAt" class="text-xs text-muted sm:ms-auto">
            {{ t('routineFetched', { time: formatRoutineTime(fetchedAt, locale) }) }}
          </span>
        </form>

        <UTable
          v-model:expanded="expanded"
          v-model:sorting="sorting"
          v-model:pagination="pagination"
          :data="filteredRecords"
          :columns="columns"
          :get-row-id="record => record.routine_id"
          :pagination-options="paginationOptions"
          :loading="loading"
          sticky
          class="@container max-h-[65vh] rounded-md border border-default"
          :ui="{ base: 'w-full min-w-5xl', th: 'whitespace-nowrap', td: 'align-top has-[>section]:p-0', tr: 'data-[expanded=true]:bg-elevated/30' }"
          @select="toggleRow"
        >
          <template v-for="columnID in sortableColumns" :key="columnID" #[`${columnID}-header`]="{ column }">
            <UTooltip :text="columnID === 'history' ? t('routineSortPanic') : t('routineSort', { column: column.columnDef.header })">
              <UButton
                color="neutral"
                variant="ghost"
                :label="String(column.columnDef.header)"
                :icon="column.getIsSorted() ? (column.getIsSorted() === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down'"
                :aria-label="columnID === 'history' ? t('routineSortPanic') : t('routineSort', { column: column.columnDef.header })"
                class="-ms-2.5 whitespace-nowrap"
                @click="column.toggleSorting(column.getIsSorted() === 'asc')"
              />
            </UTooltip>
          </template>
          <template #expand-cell="{ row }">
            <UTooltip :text="t(row.getIsExpanded() ? 'routineCollapse' : 'routineExpand')">
              <UButton
                :icon="row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                color="neutral"
                variant="ghost"
                :aria-label="`${t(row.getIsExpanded() ? 'routineCollapse' : 'routineExpand')}: ${row.original.name}`"
                :aria-expanded="row.getIsExpanded()"
                class="size-8 justify-center"
                @click.stop="row.toggleExpanded()"
              />
            </UTooltip>
          </template>
          <template #name-cell="{ row }">
            <span class="block min-w-40 max-w-64 font-mono text-sm font-medium whitespace-pre-wrap text-highlighted [overflow-wrap:anywhere]" dir="auto">{{ row.original.name }}</span>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="routineStatusColor(row.original.status)" variant="subtle">
              {{ statusLabel(row.original.status) }}
            </UBadge>
            <p class="mt-1 text-xs text-muted">
              {{ t(row.original.lease_active ? 'routineActive' : 'routineExpired') }}
            </p>
          </template>
          <template #history-cell="{ row }">
            <div class="grid min-w-64 grid-cols-2 gap-x-3 gap-y-1">
              <UTooltip v-for="status in routineStatuses" :key="status" :text="t('routineViewLogs', { status: statusLabel(status), name: row.original.name })">
                <UButton
                  :color="status === 'panic' && row.original.log_counts.panic > 0 ? 'error' : 'neutral'"
                  variant="ghost"
                  size="xs"
                  :icon="status === 'panic' && row.original.log_counts.panic > 0 ? 'i-lucide-triangle-alert' : undefined"
                  :aria-label="t('routineViewLogs', { status: statusLabel(status), name: row.original.name })"
                  class="min-h-7 justify-start whitespace-normal tabular-nums"
                  @click.stop="openStatusLogs(row, status)"
                >
                  {{ statusLabel(status) }}: {{ formatNumber(row.original.log_counts[status]) }}
                </UButton>
              </UTooltip>
              <span v-if="row.original.log_counts.other" class="px-2 py-1 text-xs text-muted">{{ t('routineOther') }}: {{ formatNumber(row.original.log_counts.other) }}</span>
            </div>
          </template>
          <template #success_count-cell="{ row }">
            <span class="tabular-nums">{{ formatNumber(row.original.success_count) }}</span>
          </template>
          <template #failure_count-cell="{ row }">
            <span class="tabular-nums" :class="row.original.failure_count ? 'font-medium text-error' : 'text-muted'">{{ formatNumber(row.original.failure_count) }}</span>
          </template>
          <template #latest_panic_at-cell="{ row }">
            <span class="text-xs whitespace-nowrap" :class="row.original.latest_panic_at ? 'text-error' : 'text-muted'">{{ formatRoutineTime(row.original.latest_panic_at, locale) }}</span>
          </template>
          <template #updated_at-cell="{ row }">
            <span class="text-xs whitespace-nowrap text-muted">{{ formatRoutineTime(row.original.updated_at, locale) }}</span>
          </template>
          <template #actions-cell="{ row }">
            <UTooltip :text="t('routineDelete')">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                :aria-label="`${t('routineDelete')}: ${row.original.name}`"
                :disabled="deleting || loading"
                class="size-8 justify-center"
                @click.stop="confirmDelete(row.original)"
              />
            </UTooltip>
          </template>
          <template #expanded="{ row }">
            <EasyRoutineLogs
              v-model:status-filter="logFilters[row.id]"
              :routine="row.original"
              :items="logCache[row.id]?.items ?? []"
              :loading="logCache[row.id]?.loading ?? true"
              :error="logCache[row.id]?.error ?? null"
              :fetched-at="logCache[row.id]?.fetchedAt ?? 0"
              @retry="loadLogs(row.id, true)"
            />
          </template>
          <template #empty>
            <p class="py-8 text-center text-sm text-muted">
              {{ t('routineEmpty') }}
            </p>
          </template>
        </UTable>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p class="text-sm text-muted" role="status">
            {{ t('routineShowing', { from: firstVisible, to: lastVisible, total: filteredRecords.length }) }}
          </p>
          <div class="flex flex-wrap items-center gap-2 sm:ms-auto">
            <span class="hidden text-sm text-muted md:inline">{{ t('routineRowsPerPage') }}</span>
            <USelect
              v-model="pagination.pageSize"
              :items="pageSizeOptions"
              :aria-label="t('routineRowsPerPage')"
              class="w-20"
            />
            <UPagination
              :page="pagination.pageIndex + 1"
              variant="ghost"
              active-variant="soft"
              :total="filteredRecords.length"
              :items-per-page="pagination.pageSize"
              :sibling-count="1"
              show-edges
              @update:page="pagination.pageIndex = $event - 1"
            />
          </div>
        </div>
      </div>

      <UModal
        v-model:open="deleteOpen"
        :title="t('routineDelete')"
        :description="t('routineDeleteConfirm', { name: deleteTarget?.name ?? '' })"
        :dismissible="!deleting"
        :close="!deleting"
        :ui="{ description: 'whitespace-pre-wrap [overflow-wrap:anywhere]' }"
      >
        <template #body>
          <form id="easyroutine-delete-form" class="space-y-4" @submit.prevent="deleteRoutine">
            <UAlert
              v-if="deleteError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="deleteError.title"
              :description="deleteError.description"
              :ui="{ title: 'whitespace-pre-wrap [overflow-wrap:anywhere]', description: 'whitespace-pre-wrap [overflow-wrap:anywhere]' }"
              role="alert"
            />
            <UFormField
              :label="t('routineConfirmName')"
              :error="deleteConfirmation && !deleteConfirmed ? t('routineNameMismatch') : undefined"
              required
            >
              <UInput
                v-model="deleteConfirmation"
                :placeholder="deleteTarget?.name"
                :disabled="deleting"
                :spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                class="w-full"
                :ui="{ base: 'font-mono' }"
              />
            </UFormField>
          </form>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="deleting"
              @click="deleteOpen = false"
            >
              {{ t('routineCancel') }}
            </UButton>
            <UButton
              type="submit"
              form="easyroutine-delete-form"
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              :loading="deleting"
              :disabled="!canManageRoutines || !deleteConfirmed"
            >
              {{ t('routineDelete') }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>