<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../../components/AppNavbar.vue'
import { apiErrorContent } from '../../components/apiErrors'
import type { ApiErrorContent } from '../../components/apiErrors'
import { apiRequest, useAuth } from '../../composables/useAuth'

interface UserRecord {
  id: number
  name: string | null
  email: string
  access: string[]
  ref_userid: number | null
  ref_channel: string | null
  last_login: string | null
  reg_ip: string
  created_at: string
  updated_at: string
}

interface UsersResponse {
  items: UserRecord[]
  access_options: string[]
  page: number
  page_size: number
  total: number
}

interface UserFormState {
  id: number | null
  name: string
  email: string
  password: string
  access: string[]
}

const allAccessFilter = '__all__'
const { locale, t } = useI18n()
const toast = useToast()
const { canManageUsers } = useAuth()
const users = ref<UserRecord[]>([])
const accessOptions = ref(['user', 'admin', 'viewall', 'am'])
const idSearch = ref('')
const nameSearch = ref('')
const emailSearch = ref('')
const refUserIDSearch = ref('')
const refChannelSearch = ref('')
const refChannelDisabled = computed(() => refUserIDSearch.value.trim() === '')
const refChannelHintOpen = ref(false)
watch(refUserIDSearch, () => {
  refChannelSearch.value = ''
  refChannelHintOpen.value = false
}, { flush: 'sync' })
const regIPSearch = ref('')
const appliedID = ref('')
const appliedName = ref('')
const appliedEmail = ref('')
const appliedRefUserID = ref('')
const appliedRefChannel = ref('')
const appliedRegIP = ref('')
const accessFilter = ref(allAccessFilter)
const appliedAccess = ref(allAccessFilter)
const filtersOpen = ref(false)
const filterFields = [
  { key: 'id', label: 'usersId', draft: idSearch, applied: appliedID, empty: '' },
  { key: 'name', label: 'usersName', draft: nameSearch, applied: appliedName, empty: '' },
  { key: 'email', label: 'usersEmail', draft: emailSearch, applied: appliedEmail, empty: '' },
  { key: 'ref_userid', label: 'usersRefUserID', draft: refUserIDSearch, applied: appliedRefUserID, empty: '' },
  { key: 'ref_channel', label: 'usersRefChannel', draft: refChannelSearch, applied: appliedRefChannel, empty: '' },
  { key: 'reg_ip', label: 'usersRegIP', draft: regIPSearch, applied: appliedRegIP, empty: '' },
  { key: 'access', label: 'usersAccess', draft: accessFilter, applied: appliedAccess, empty: allAccessFilter }
]
const activeFilters = computed(() => filterFields
  .filter(field => field.applied.value !== field.empty)
  .map(field => ({ key: field.key, label: `${t(field.label)}: ${field.applied.value}` })))
watch(filtersOpen, open => {
  if (open) restoreFilterDrafts()
})
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)
const loadError = ref<ApiErrorContent | null>(null)
const editorOpen = ref(false)
const saving = ref(false)
const formError = ref<ApiErrorContent | null>(null)
const form = reactive<UserFormState>(emptyForm())
const pageSizeOptions = [10, 20, 50].map(value => ({ label: String(value), value }))
let requestVersion = 0

const columns = computed<TableColumn<UserRecord>[]>(() => {
  const value: TableColumn<UserRecord>[] = [
    { accessorKey: 'id', header: t('usersId') },
    { accessorKey: 'name', header: t('usersName') },
    { accessorKey: 'email', header: t('usersEmail') },
    { accessorKey: 'access', header: t('usersAccess') },
    { accessorKey: 'ref_userid', header: t('usersRefUserID') },
    { accessorKey: 'ref_channel', header: t('usersRefChannel') },
    { accessorKey: 'last_login', header: t('usersLastLogin') },
    { accessorKey: 'reg_ip', header: t('usersRegIP') },
    { accessorKey: 'created_at', header: t('usersCreated') }
  ]
  if (canManageUsers.value) value.push({ id: 'actions', header: t('usersActions') })
  return value
})
const accessFilterOptions = computed(() => [
  { label: t('usersAllAccess'), value: allAccessFilter },
  ...accessOptions.value.map(value => ({ label: value, value }))
])
const firstVisible = computed(() => total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1)
const lastVisible = computed(() => Math.min(page.value * pageSize.value, total.value))
const editing = computed(() => form.id !== null)
const editorTitle = computed(() => t(editing.value ? 'usersUpdateTitle' : 'usersCreateTitle'))
const editorDescription = computed(() => t(editing.value ? 'usersUpdateDescription' : 'usersCreateDescription'))

function emptyForm(): UserFormState {
  return { id: null, name: '', email: '', password: '', access: ['user'] }
}

function resetForm(value: UserFormState) {
  Object.assign(form, value)
  formError.value = null
}

function openCreate() {
  if (!canManageUsers.value) return
  resetForm(emptyForm())
  editorOpen.value = true
}

function openEdit(user: UserRecord) {
  if (!canManageUsers.value) return
  resetForm({
    id: user.id,
    name: user.name ?? '',
    email: user.email,
    password: '',
    access: [...user.access]
  })
  editorOpen.value = true
}

function toggleAccess(permission: string, checked: boolean) {
  if (checked && !form.access.includes(permission)) form.access.push(permission)
  if (!checked) form.access = form.access.filter(value => value !== permission)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

async function loadUsers() {
  const version = ++requestVersion
  loading.value = true
  loadError.value = null
  const query = new URLSearchParams({ page: String(page.value), page_size: String(pageSize.value) })
  if (appliedID.value) query.set('id', appliedID.value)
  if (appliedName.value) query.set('name', appliedName.value)
  if (appliedEmail.value) query.set('email', appliedEmail.value)
  if (appliedRefUserID.value) query.set('ref_userid', appliedRefUserID.value)
  if (appliedRefChannel.value) query.set('ref_channel', appliedRefChannel.value)
  if (appliedRegIP.value) query.set('reg_ip', appliedRegIP.value)
  if (appliedAccess.value !== allAccessFilter) query.set('access', appliedAccess.value)
  try {
    const response = await apiRequest<UsersResponse>(`/admin/users/list?${query}`)
    if (version !== requestVersion) return
    users.value = response.items
    accessOptions.value = response.access_options
    total.value = response.total
    const lastPage = Math.max(1, Math.ceil(response.total / pageSize.value))
    if (page.value > lastPage) page.value = lastPage
  } catch (error) {
    if (version !== requestVersion) return
    users.value = []
    total.value = 0
    loadError.value = apiErrorContent(error, t('usersLoadError'))
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function applyFilters() {
  appliedID.value = idSearch.value.trim()
  appliedName.value = nameSearch.value.trim()
  appliedEmail.value = emailSearch.value.trim()
  appliedRefUserID.value = refUserIDSearch.value.trim()
  appliedRefChannel.value = refChannelDisabled.value ? '' : refChannelSearch.value.trim()
  appliedRegIP.value = regIPSearch.value.trim()
  appliedAccess.value = accessFilter.value
  filtersOpen.value = false
  if (page.value === 1) void loadUsers()
  else page.value = 1
}

function restoreFilterDrafts() {
  for (const field of filterFields) field.draft.value = field.applied.value
}

function clearFilters() {
  for (const field of filterFields) field.draft.value = field.empty
  applyFilters()
}

function removeFilter(key: string) {
  restoreFilterDrafts()
  const field = filterFields.find(field => field.key === key)
  if (!field) return
  field.draft.value = field.empty
  applyFilters()
}

async function saveUser() {
  if (!canManageUsers.value || saving.value) return
  formError.value = null
  const passwordLength = Array.from(form.password).length
  const passwordBytes = new TextEncoder().encode(form.password).length
  if ((!editing.value || form.password !== '') && (passwordLength < 8 || passwordBytes > 72)) {
    formError.value = { description: t('usersInvalidPassword') }
    return
  }
  saving.value = true
  const wasEditing = editing.value
  try {
    const body = {
      name: form.name.trim() || null,
      email: form.email.trim(),
      password: form.password,
      access: form.access
    }
    if (form.id === null) await apiRequest<UserRecord>('/admin/users/create', body)
    else await apiRequest<UserRecord>('/admin/users/update', { ...body, id: form.id })
    editorOpen.value = false
    toast.add({ title: t(wasEditing ? 'usersUpdatedSuccess' : 'usersCreatedSuccess'), color: 'success' })
    await loadUsers()
  } catch (error) {
    formError.value = apiErrorContent(error, t('usersWriteError'))
  } finally {
    saving.value = false
  }
}

watch(pageSize, () => {
  if (page.value === 1) void loadUsers()
  else page.value = 1
})
watch(page, () => void loadUsers())
onBeforeUnmount(() => {
  requestVersion += 1
})

void loadUsers()
</script>

<template>
  <UDashboardPanel id="users" :ui="{ body: 'overflow-hidden p-0 sm:p-0' }">
    <template #header>
      <AppNavbar title-key="users" />
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
          <div class="flex shrink-0 items-center gap-2 border-b border-default p-3">
            <UButton
              icon="i-lucide-sliders-horizontal"
              color="neutral"
              variant="soft"
              @click="filtersOpen = true"
            >
              {{ t('usersFilters') }}
              <UBadge
                v-if="activeFilters.length"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ activeFilters.length }}
              </UBadge>
            </UButton>
            <UTooltip :text="t('usersRefresh')">
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="ghost"
                :loading="loading"
                :aria-label="t('usersRefresh')"
                @click="loadUsers"
              />
            </UTooltip>
            <UButton
              v-if="canManageUsers"
              icon="i-lucide-user-plus"
              variant="soft"
              class="ml-auto"
              @click="openCreate"
            >
              {{ t('usersAdd') }}
            </UButton>
            <UBadge
              v-else
              color="neutral"
              variant="subtle"
              class="ml-auto"
            >
              {{ t('usersReadOnly') }}
            </UBadge>
          </div>
          <div v-if="activeFilters.length" class="flex shrink-0 flex-wrap items-center gap-2 border-b border-default px-3 py-2">
            <UButton
              v-for="filter in activeFilters"
              :key="filter.key"
              color="neutral"
              variant="soft"
              size="xs"
              trailing-icon="i-lucide-x"
              :aria-label="t('usersRemoveFilter', { filter: filter.label })"
              class="max-w-full"
              :ui="{ label: 'truncate' }"
              @click="removeFilter(filter.key)"
            >
              {{ filter.label }}
            </UButton>
            <UButton
              color="neutral"
              variant="link"
              size="xs"
              @click="clearFilters"
            >
              {{ t('usersClearFilters') }}
            </UButton>
          </div>
          <USlideover v-model:open="filtersOpen" :title="t('usersFilters')">
            <template #body>
              <form
                id="users-filter-form"
                class="space-y-4"
                @submit.prevent="applyFilters"
              >
                <div class="grid grid-cols-1 gap-4">
                  <UFormField :label="t('usersId')">
                    <UInput
                      v-model="idSearch"
                      variant="soft"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      maxlength="20"
                      :placeholder="t('usersId')"
                      :aria-label="t('usersId')"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField :label="t('usersName')">
                    <UInput
                      v-model="nameSearch"
                      variant="soft"
                      :placeholder="t('usersName')"
                      :aria-label="t('usersName')"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField :label="t('usersEmail')">
                    <UInput
                      v-model="emailSearch"
                      variant="soft"
                      :placeholder="t('usersEmail')"
                      :aria-label="t('usersEmail')"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField :label="t('usersRefUserID')">
                    <UInput
                      v-model="refUserIDSearch"
                      variant="soft"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      maxlength="20"
                      :placeholder="t('usersRefUserID')"
                      :aria-label="t('usersRefUserID')"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField :label="t('usersRefChannel')">
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
                          variant="soft"
                          :placeholder="t('usersRefChannel')"
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
                      variant="soft"
                      maxlength="32"
                      :placeholder="t('usersRefChannel')"
                      :aria-label="t('usersRefChannel')"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField :label="t('usersRegIP')">
                    <UInput
                      v-model="regIPSearch"
                      variant="soft"
                      maxlength="45"
                      :placeholder="t('usersRegIP')"
                      :aria-label="t('usersRegIP')"
                      dir="ltr"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField :label="t('usersAccess')">
                    <USelect
                      v-model="accessFilter"
                      :items="accessFilterOptions"
                      variant="soft"
                      :aria-label="t('usersAccessFilter')"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </form>
            </template>
            <template #footer>
              <div class="flex w-full items-center justify-between gap-2">
                <UButton color="neutral" variant="outline" @click="clearFilters">
                  {{ t('usersClearFilters') }}
                </UButton>
                <UButton type="submit" form="users-filter-form" icon="i-lucide-check">
                  {{ t('usersApplyFilters') }}
                </UButton>
              </div>
            </template>
          </USlideover>

          <div class="min-h-0 flex-1 overflow-auto">
            <UTable
              :data="users"
              :columns="columns"
              :loading="loading"
              sticky
              class="min-w-5xl"
              :ui="{ th: 'whitespace-nowrap', td: 'align-middle' }"
            >
              <template #name-cell="{ row }">
                <span :class="row.original.name ? 'text-highlighted' : 'text-muted'">
                  {{ row.original.name || '—' }}
                </span>
              </template>

              <template #email-cell="{ row }">
                <span class="font-medium text-highlighted">{{ row.original.email }}</span>
              </template>

              <template #access-cell="{ row }">
                <div class="flex max-w-72 flex-wrap gap-1.5">
                  <UBadge
                    v-for="permission in row.original.access"
                    :key="permission"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >
                    {{ permission }}
                  </UBadge>
                </div>
              </template>

              <template #ref_userid-cell="{ row }">
                <span class="font-mono text-xs whitespace-nowrap">{{ row.original.ref_userid ?? '-' }}</span>
              </template>

              <template #ref_channel-cell="{ row }">
                <span class="font-mono text-xs whitespace-nowrap">{{ row.original.ref_channel ?? '-' }}</span>
              </template>

              <template #last_login-cell="{ row }">
                <time v-if="row.original.last_login" :datetime="row.original.last_login" class="whitespace-nowrap text-muted">
                  {{ formatDate(row.original.last_login) }}
                </time>
                <span v-else class="text-muted">-</span>
              </template>

              <template #reg_ip-cell="{ row }">
                <span class="font-mono text-xs whitespace-nowrap">{{ row.original.reg_ip || '-' }}</span>
              </template>

              <template #created_at-cell="{ row }">
                <time :datetime="row.original.created_at" class="whitespace-nowrap text-muted">
                  {{ formatDate(row.original.created_at) }}
                </time>
              </template>

              <template v-if="canManageUsers" #actions-cell="{ row }">
                <UTooltip :text="t('usersEdit')">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="`${t('usersEdit')}: ${row.original.email}`"
                    @click="openEdit(row.original)"
                  />
                </UTooltip>
              </template>

              <template #empty>
                <div class="py-12 text-center text-sm text-muted">
                  {{ t('usersEmpty') }}
                </div>
              </template>
            </UTable>
          </div>

          <div
            class="flex shrink-0 flex-col gap-2 border-t border-default px-3 py-2 sm:flex-row sm:items-center"
          >
            <p class="text-sm text-muted">
              {{ t('usersShowing', { from: firstVisible, to: lastVisible, total }) }}
            </p>
            <div class="flex items-center gap-2 sm:ml-auto">
              <span class="hidden text-sm text-muted md:inline">{{ t('usersRowsPerPage') }}</span>
              <USelect v-model="pageSize" :items="pageSizeOptions" class="w-20" />
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

      <UModal v-model:open="editorOpen" :title="editorTitle" :description="editorDescription">
        <template #body>
          <form id="user-editor-form" class="space-y-4" @submit.prevent="saveUser">
            <UAlert
              v-if="formError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="formError.title"
              :description="formError.description"
              :ui="{ title: 'whitespace-pre-wrap [overflow-wrap:anywhere]', description: 'whitespace-pre-wrap [overflow-wrap:anywhere]' }"
              role="alert"
            />
            <UFormField :label="t('usersNameOptional')">
              <UInput v-model="form.name" maxlength="100" class="w-full" />
            </UFormField>
            <UFormField :label="t('email')" required>
              <UInput
                v-model="form.email"
                type="email"
                maxlength="254"
                required
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="editing ? t('newPassword') : t('password')"
              :description="t(editing ? 'usersPasswordEditHint' : 'usersPasswordCreateHint')"
              :required="!editing"
            >
              <UInput
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :required="!editing"
                class="w-full"
              />
            </UFormField>
            <fieldset>
              <legend class="mb-2 text-sm font-medium text-highlighted">
                {{ t('usersAccess') }}
              </legend>
              <div class="grid grid-cols-2 gap-3 rounded-md border border-default p-3 sm:grid-cols-4">
                <UCheckbox
                  v-for="permission in accessOptions"
                  :key="permission"
                  :model-value="form.access.includes(permission)"
                  :label="permission"
                  @update:model-value="toggleAccess(permission, $event === true)"
                />
              </div>
            </fieldset>
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
              {{ t('usersCancel') }}
            </UButton>
            <UButton
              type="submit"
              form="user-editor-form"
              icon="i-lucide-save"
              variant="soft"
              :loading="saving"
            >
              {{ saving ? t('usersSaving') : t('usersSave') }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>