<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../../components/AppNavbar.vue'
import { apiErrorContent } from '../../components/apiErrors'
import type { ApiErrorContent } from '../../components/apiErrors'
import { apiRequest, useAuth } from '../../composables/useAuth'

interface ReferralStatistic {
  ref_userid: number
  ref_channel: string
  count: number
}

interface StatisticsResponse {
  items: ReferralStatistic[]
  total: number
  page: number
  page_size: number
}

const { t, locale } = useI18n()
const { user, canViewAdmin } = useAuth()
const refUserIDSearch = ref('')
const refChannelSearch = ref('')
const effectiveRefUserID = computed(() => canViewAdmin.value
  ? refUserIDSearch.value.trim()
  : user.value ? String(user.value.id) : '')
const refChannelDisabled = computed(() => effectiveRefUserID.value === '')
const refChannelHintOpen = ref(false)
watch([refUserIDSearch, effectiveRefUserID], () => {
  refChannelSearch.value = ''
  refChannelHintOpen.value = false
}, { flush: 'sync' })
const appliedUserID = ref('')
const appliedChannel = ref('')
const items = ref<ReferralStatistic[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const loadError = shallowRef<ApiErrorContent | null>(null)
const pageSizeOptions = [10, 20, 50]
let requestVersion = 0

const columns = computed<TableColumn<ReferralStatistic>[]>(() => [
  { accessorKey: 'ref_userid', header: t('usersRefUserID') },
  { accessorKey: 'ref_channel', header: t('usersRefChannel') },
  { accessorKey: 'count', header: t('refStatisticsCount') }
])
const firstVisible = computed(() => total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1)
const lastVisible = computed(() => Math.min(page.value * pageSize.value, total.value))
const numberFormat = computed(() => new Intl.NumberFormat(locale.value))

async function loadStatistics() {
  const version = ++requestVersion
  loading.value = true
  loadError.value = null
  const query = new URLSearchParams({ page: String(page.value), page_size: String(pageSize.value) })
  const refUserID = canViewAdmin.value ? appliedUserID.value : user.value ? String(user.value.id) : ''
  if (refUserID) query.set('ref_userid', refUserID)
  if (appliedChannel.value) query.set('ref_channel', appliedChannel.value)
  try {
    const response = await apiRequest<StatisticsResponse>(`/am/refstatistics/list?${query}`)
    if (version !== requestVersion) return
    items.value = response.items
    total.value = response.total
    const lastPage = Math.max(1, Math.ceil(response.total / pageSize.value))
    if (page.value > lastPage) page.value = lastPage
  } catch (error) {
    if (version !== requestVersion) return
    items.value = []
    total.value = 0
    loadError.value = apiErrorContent(error, t('refStatisticsLoadError'))
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function search() {
  appliedUserID.value = canViewAdmin.value ? refUserIDSearch.value.trim() : ''
  appliedChannel.value = refChannelDisabled.value ? '' : refChannelSearch.value.trim()
  if (page.value === 1) void loadStatistics()
  else page.value = 1
}

watch(page, () => void loadStatistics())
watch(pageSize, () => {
  if (page.value === 1) void loadStatistics()
  else page.value = 1
})
onBeforeUnmount(() => { requestVersion += 1 })
void loadStatistics()
</script>

<template>
  <UDashboardPanel id="refstatistics" :ui="{ body: 'overflow-hidden p-0 sm:p-0' }">
    <template #header>
      <AppNavbar title-key="refStatisticsTitle" />
    </template>
    <template #body>
      <div class="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
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
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-default">
          <form class="grid shrink-0 grid-cols-2 items-end gap-3 border-b border-default p-3 sm:flex sm:flex-wrap" @submit.prevent="search">
            <UFormField :label="t('usersRefUserID')" class="min-w-0 sm:w-48">
              <UInput
                v-if="canViewAdmin"
                v-model="refUserIDSearch"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="20"
                :placeholder="t('refStatisticsAll')"
                class="w-full"
              />
              <UInput
                v-else
                :model-value="String(user?.id ?? '')"
                readonly
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('usersRefChannel')" class="min-w-0 sm:w-56">
              <UPopover v-if="refChannelDisabled" v-model:open="refChannelHintOpen">
                <span
                  role="button"
                  tabindex="0"
                  :aria-label="t('usersRefChannelNeedsUserID')"
                  class="block w-full"
                  @keydown.enter.prevent="refChannelHintOpen = !refChannelHintOpen"
                  @keydown.space.prevent="refChannelHintOpen = !refChannelHintOpen"
                >
                  <UInput
                    disabled
                    :placeholder="t('refStatisticsAll')"
                    :aria-label="t('usersRefChannel')"
                    class="pointer-events-none w-full"
                  />
                </span>
                <template #content>
                  <p class="px-3 py-2 text-sm">
                    {{ t('usersRefChannelNeedsUserID') }}
                  </p>
                </template>
              </UPopover>
              <UInput
                v-else
                v-model="refChannelSearch"
                maxlength="32"
                :placeholder="t('refStatisticsAll')"
                class="w-full"
              />
            </UFormField>
            <div class="col-span-2 flex items-center gap-2">
              <UButton
                type="submit"
                icon="i-lucide-search"
                color="primary"
                variant="soft"
                :loading="loading"
              >
                {{ t('usersSearch') }}
              </UButton>
            </div>
          </form>
          <div class="min-h-0 flex-1 overflow-auto">
            <UTable
              :data="items"
              :columns="columns"
              :loading="loading"
              sticky
              :ui="{ th: 'whitespace-nowrap', td: 'align-middle' }"
            >
              <template #ref_userid-cell="{ row }">
                <span class="font-mono text-xs">{{ row.original.ref_userid }}</span>
              </template>
              <template #ref_channel-cell="{ row }">
                <span class="font-mono text-xs">{{ row.original.ref_channel }}</span>
              </template>
              <template #count-cell="{ row }">
                <span class="font-medium tabular-nums">{{ numberFormat.format(row.original.count) }}</span>
              </template>
              <template #empty>
                <div class="py-12 text-center text-sm text-muted">
                  {{ t('refStatisticsEmpty') }}
                </div>
              </template>
            </UTable>
          </div>
          <div class="flex shrink-0 flex-col gap-2 border-t border-default px-3 py-2 sm:flex-row sm:items-center">
            <p class="text-sm text-muted">
              {{ t('refStatisticsShowing', { from: firstVisible, to: lastVisible, total }) }}
            </p>
            <div class="flex items-center gap-2 sm:ml-auto">
              <USelect
                v-model="pageSize"
                :items="pageSizeOptions"
                :aria-label="t('usersRowsPerPage')"
                class="w-20"
              />
              <UPagination
                v-model:page="page"
                variant="ghost"
                active-variant="soft"
                :total="total"
                :items-per-page="pageSize"
                :sibling-count="1"
                show-edges
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
