<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../../components/AppNavbar.vue'
import { apiErrorContent } from '../../components/apiErrors'
import type { ApiErrorContent } from '../../components/apiErrors'
import { filterDBKVRecords, isValidDBKVKey, isValidJSON } from '../../components/dbkvRecords'
import type { DBKVRecord } from '../../components/dbkvRecords'
import { apiRequest, useAuth } from '../../composables/useAuth'

const { t } = useI18n()
const toast = useToast()
const { canManageUsers: canManageDBKV } = useAuth()
const records = ref<DBKVRecord[]>([])
const search = ref('')
const page = ref(1)
const pageSize = ref(20)
const pageSizeOptions = [10, 20, 50].map(value => ({ label: String(value), value }))
const loading = ref(false)
const loadError = ref<ApiErrorContent | null>(null)
const editorOpen = ref(false)
const creating = ref(false)
const saving = ref(false)
const formError = ref<ApiErrorContent | null>(null)
const form = reactive({ key: '', value: '', description: '' })
const deleteOpen = ref(false)
const deleteTarget = ref<DBKVRecord | null>(null)
const deleteConfirmation = ref('')
const deleteConfirmed = computed(() => !!deleteTarget.value && deleteConfirmation.value === deleteTarget.value.key)
const deleting = ref(false)
const deleteError = ref<ApiErrorContent | null>(null)
const busy = computed(() => saving.value || deleting.value)
const filteredRecords = computed(() => filterDBKVRecords(records.value, search.value))
const lastPage = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value)))
const pageRecords = computed(() => filteredRecords.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const firstVisible = computed(() => filteredRecords.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const lastVisible = computed(() => Math.min(page.value * pageSize.value, filteredRecords.value.length))
const jsonError = computed(() => isValidJSON(form.value) ? undefined : t('dbkvInvalidJSON'))
const keyError = computed(() => creating.value && !isValidDBKVKey(form.key) ? t('dbkvInvalidKey') : undefined)
const errorUI = { title: 'whitespace-pre-wrap [overflow-wrap:anywhere]', description: 'whitespace-pre-wrap [overflow-wrap:anywhere]' }
let requestVersion = 0

const columns = computed<TableColumn<DBKVRecord>[]>(() => {
  const result: TableColumn<DBKVRecord>[] = [
    { accessorKey: 'key', header: t('dbkvKey'), meta: { class: { th: 'w-1/4' } } },
    { accessorKey: 'value', header: t('dbkvValue'), meta: { class: { th: 'w-1/3' } } },
    { accessorKey: 'description', header: t('dbkvDescription') }
  ]
  if (canManageDBKV.value) result.push({ id: 'actions', header: t('dbkvActions'), meta: { class: { th: 'w-24' } } })
  return result
})

function rowActions(record: DBKVRecord): DropdownMenuItem[][] {
  return [[{
    label: t('dbkvEdit'),
    icon: 'i-lucide-pencil',
    disabled: busy.value || loading.value,
    onSelect: () => openEdit(record)
  }], [{
    label: t('dbkvDelete'),
    icon: 'i-lucide-trash-2',
    color: 'error',
    disabled: busy.value || loading.value,
    onSelect: () => confirmDelete(record)
  }]]
}

async function loadRecords() {
  const version = ++requestVersion
  loading.value = true
  loadError.value = null
  try {
    const response = await apiRequest<{ items: DBKVRecord[] }>('/admin/dbkv/list')
    if (version === requestVersion) records.value = response.items
  } catch (error) {
    if (version !== requestVersion) return
    records.value = []
    loadError.value = apiErrorContent(error, t('dbkvLoadError'))
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function openCreate() {
  if (!canManageDBKV.value || busy.value) return
  creating.value = true
  Object.assign(form, { key: '', value: '{}', description: '' })
  formError.value = null
  editorOpen.value = true
}

function openEdit(record: DBKVRecord) {
  if (!canManageDBKV.value || busy.value) return
  creating.value = false
  Object.assign(form, { key: record.key, value: record.value, description: record.description })
  formError.value = null
  editorOpen.value = true
}

async function saveRecord() {
  if (!canManageDBKV.value || busy.value || jsonError.value || keyError.value) return
  saving.value = true
  formError.value = null
  const wasCreating = creating.value
  try {
    await apiRequest(wasCreating ? '/admin/dbkv/create' : '/admin/dbkv/update', { ...form, key: form.key.trim() })
    editorOpen.value = false
    toast.add({ title: t(wasCreating ? 'dbkvCreated' : 'dbkvUpdated'), color: 'success' })
    if (wasCreating) search.value = ''
    await loadRecords()
    if (wasCreating) page.value = lastPage.value
  } catch (error) {
    formError.value = apiErrorContent(error, t(wasCreating ? 'dbkvCreateError' : 'dbkvUpdateError'))
  } finally {
    saving.value = false
  }
}

function confirmDelete(record: DBKVRecord) {
  if (!canManageDBKV.value || busy.value) return
  deleteTarget.value = record
  deleteConfirmation.value = ''
  deleteError.value = null
  deleteOpen.value = true
}

async function deleteRecord() {
  if (!canManageDBKV.value || busy.value || !deleteTarget.value || !deleteConfirmed.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await apiRequest('/admin/dbkv/del', { key: deleteTarget.value.key })
    deleteOpen.value = false
    toast.add({ title: t('dbkvDeleted'), color: 'success' })
    await loadRecords()
  } catch (error) {
    deleteError.value = apiErrorContent(error, t('dbkvDeleteError'))
  } finally {
    deleting.value = false
  }
}

watch([search, pageSize], () => { page.value = 1 })
watch(lastPage, () => { page.value = Math.min(page.value, lastPage.value) })

onMounted(loadRecords)
onBeforeUnmount(() => { requestVersion += 1 })
</script>

<template>
  <UDashboardPanel id="dbkv">
    <template #header>
      <AppNavbar title-key="dbkv" />
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
          :ui="errorUI"
          role="alert"
        />

        <div class="flex flex-wrap items-center gap-3">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            variant="soft"
            :placeholder="t('dbkvSearch')"
            :aria-label="t('dbkvSearch')"
            class="min-w-0 flex-1 sm:max-w-md"
          />
          <UTooltip :text="t('dbkvRefresh')">
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              :aria-label="t('dbkvRefresh')"
              :loading="loading"
              :disabled="busy"
              class="size-8 shrink-0 cursor-pointer justify-center"
              @click="loadRecords"
            />
          </UTooltip>
          <UBadge v-if="!canManageDBKV" color="neutral" variant="subtle">
            {{ t('dbkvReadOnly') }}
          </UBadge>
          <UButton
            v-if="canManageDBKV"
            icon="i-lucide-plus"
            variant="soft"
            :disabled="busy || loading"
            class="w-full cursor-pointer justify-center whitespace-normal sm:ml-auto sm:w-auto"
            @click="openCreate"
          >
            {{ t('dbkvAdd') }}
          </UButton>
        </div>

        <div class="overflow-auto rounded-md border border-default">
          <UTable
            :data="pageRecords"
            :columns="columns"
            :loading="loading"
            class="min-w-2xl"
            :ui="{ base: 'table-fixed', th: 'whitespace-nowrap', td: 'align-top' }"
          >
            <template #key-cell="{ row }">
              <code class="text-sm font-medium whitespace-pre-wrap text-highlighted [overflow-wrap:anywhere]" dir="auto">{{ row.original.key }}</code>
            </template>
            <template #value-cell="{ row }">
              <pre class="max-h-40 overflow-auto font-mono text-xs leading-5 whitespace-pre-wrap [overflow-wrap:anywhere]" dir="ltr">{{ row.original.value }}</pre>
            </template>
            <template #description-cell="{ row }">
              <p class="max-h-40 overflow-auto whitespace-pre-wrap text-muted [overflow-wrap:anywhere]" dir="auto">
                {{ row.original.description }}
              </p>
            </template>
            <template v-if="canManageDBKV" #actions-cell="{ row }">
              <UDropdownMenu :items="rowActions(row.original)" :content="{ align: 'end' }" :modal="false">
                <UTooltip :text="t('dbkvActions')">
                  <UButton
                    icon="i-lucide-ellipsis"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="`${t('dbkvActions')}: ${row.original.key}`"
                    :disabled="busy || loading"
                    class="size-8 cursor-pointer justify-center"
                  />
                </UTooltip>
              </UDropdownMenu>
            </template>
            <template #empty>
              <p class="py-8 text-center text-sm text-muted">
                {{ t('dbkvEmpty') }}
              </p>
            </template>
          </UTable>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p class="text-sm text-muted" role="status">
            {{ t('dbkvCount', { from: firstVisible, to: lastVisible, total: filteredRecords.length }) }}
          </p>
          <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
            <span class="hidden text-sm text-muted md:inline">{{ t('dbkvRowsPerPage') }}</span>
            <USelect
              v-model="pageSize"
              :items="pageSizeOptions"
              :aria-label="t('dbkvRowsPerPage')"
              class="w-20"
            />
            <UPagination
              v-model:page="page"
              :total="filteredRecords.length"
              :items-per-page="pageSize"
              :sibling-count="1"
              show-edges
            />
          </div>
        </div>
      </div>

      <UModal
        v-model:open="editorOpen"
        :title="t(creating ? 'dbkvAdd' : 'dbkvEdit')"
        :dismissible="!saving"
        :close="!saving"
        :ui="{ content: 'sm:max-w-2xl' }"
      >
        <template #body>
          <form id="dbkv-editor-form" class="space-y-4" @submit.prevent="saveRecord">
            <UAlert
              v-if="formError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="formError.title"
              :description="formError.description"
              :ui="errorUI"
              role="alert"
            />
            <UFormField :label="t('dbkvKey')" :required="creating" :error="form.key ? keyError : undefined">
              <UInput
                v-model="form.key"
                :readonly="!creating"
                :disabled="saving"
                :spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                class="w-full"
                :ui="{ base: 'font-mono' }"
              />
            </UFormField>
            <UFormField :label="t('dbkvValue')" :error="jsonError" required>
              <UTextarea
                v-model="form.value"
                :rows="12"
                :disabled="saving"
                :spellcheck="false"
                autocapitalize="off"
                dir="ltr"
                class="w-full"
                :ui="{ base: 'font-mono text-sm' }"
              />
            </UFormField>
            <UFormField :label="t('dbkvDescription')">
              <UTextarea
                v-model="form.description"
                :rows="3"
                :disabled="saving"
                class="w-full"
              />
            </UFormField>
          </form>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="saving"
              @click="editorOpen = false"
            >
              {{ t('dbkvCancel') }}
            </UButton>
            <UButton
              type="submit"
              form="dbkv-editor-form"
              :icon="creating ? 'i-lucide-plus' : 'i-lucide-save'"
              variant="soft"
              :loading="saving"
              :disabled="!!jsonError || !!keyError || !canManageDBKV"
            >
              {{ t(creating ? 'dbkvAdd' : 'dbkvSave') }}
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="deleteOpen"
        :title="t('dbkvDelete')"
        :description="t('dbkvDeleteConfirm', { key: deleteTarget?.key ?? '' })"
        :dismissible="!deleting"
        :close="!deleting"
        :ui="{ description: '[overflow-wrap:anywhere]' }"
      >
        <template #body>
          <form id="dbkv-delete-form" class="space-y-4" @submit.prevent="deleteRecord">
            <UAlert
              v-if="deleteError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="deleteError.title"
              :description="deleteError.description"
              :ui="errorUI"
              role="alert"
            />
            <UFormField
              :label="t('dbkvConfirmKey')"
              :error="deleteConfirmation && !deleteConfirmed ? t('dbkvKeyMismatch') : undefined"
              required
            >
              <UInput
                v-model="deleteConfirmation"
                :placeholder="deleteTarget?.key"
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
              {{ t('dbkvCancel') }}
            </UButton>
            <UButton
              type="submit"
              form="dbkv-delete-form"
              icon="i-lucide-trash-2"
              color="error"
              variant="soft"
              :loading="deleting"
              :disabled="!canManageDBKV || !deleteConfirmed"
            >
              {{ t('dbkvDelete') }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>