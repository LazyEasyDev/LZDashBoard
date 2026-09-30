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
const appliedID = ref('')
const appliedName = ref('')
const appliedEmail = ref('')
const accessFilter = ref(allAccessFilter)
const appliedAccess = ref(allAccessFilter)
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
  appliedAccess.value = accessFilter.value
  if (page.value === 1) void loadUsers()
  else page.value = 1
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
  <UDashboardPanel id="users">
    <template #header>
      <AppNavbar title-key="users" />
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

        <div class="flex flex-col overflow-hidden rounded-md border border-default">
          <form
            class="space-y-3 border-b border-accented px-4 py-3.5"
            @submit.prevent="applyFilters"
          >
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
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
              <UInput
                v-model="nameSearch"
                variant="soft"
                :placeholder="t('usersName')"
                :aria-label="t('usersName')"
                class="w-full"
              />
              <UInput
                v-model="emailSearch"
                variant="soft"
                :placeholder="t('usersEmail')"
                :aria-label="t('usersEmail')"
                class="w-full"
              />
              <USelect
                v-model="accessFilter"
                :items="accessFilterOptions"
                variant="soft"
                :aria-label="t('usersAccessFilter')"
                class="w-full"
              />
              <UButton
                type="submit"
                icon="i-lucide-funnel"
                color="neutral"
                variant="soft"
                :loading="loading"
                block
                class="cursor-pointer justify-center whitespace-normal"
              >
                {{ t('usersSearch') }}
              </UButton>
            </div>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <UBadge
                v-if="!canManageUsers"
                color="neutral"
                variant="subtle"
                class="w-fit self-center"
              >
                {{ t('usersReadOnly') }}
              </UBadge>
              <UButton
                v-if="canManageUsers"
                type="button"
                icon="i-lucide-user-plus"
                variant="soft"
                block
                class="cursor-pointer justify-center whitespace-normal"
                @click="openCreate"
              >
                {{ t('usersAdd') }}
              </UButton>
            </div>
          </form>

          <div class="max-h-[60vh] overflow-auto">
            <UTable
              :data="users"
              :columns="columns"
              :loading="loading"
              sticky
              class="min-w-4xl"
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
            class="flex flex-col gap-3 border-t border-default px-4 py-3.5 sm:flex-row sm:items-center"
          >
            <p class="text-sm text-muted">
              {{ t('usersShowing', { from: firstVisible, to: lastVisible, total }) }}
            </p>
            <div class="flex items-center gap-2 sm:ml-auto">
              <span class="hidden text-sm text-muted md:inline">{{ t('usersRowsPerPage') }}</span>
              <USelect v-model="pageSize" :items="pageSizeOptions" class="w-20" />
              <UPagination
                v-model:page="page"
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