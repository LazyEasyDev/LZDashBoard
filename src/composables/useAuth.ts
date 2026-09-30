import { computed, readonly, shallowRef } from 'vue'
import { API_ORIGIN } from '../config/api'

export interface SessionUser {
  id: number
  name: string | null
  email: string
  access: string
  created_at: string
  updated_at: string
}

export class ApiError extends Error {
  constructor(public status: number, public detail: string, public title = '') {
    super(detail || title)
  }
}

export async function apiRequest<Response>(path: string, body?: unknown): Promise<Response> {
  const requestMethod = body === undefined ? 'GET' : 'POST'
  const response = await fetch(`${API_ORIGIN}${path}`, {
		method: requestMethod,
    credentials: 'include',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
    headers: body === undefined ? undefined : {
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const title = data && typeof data === 'object' && 'title' in data && typeof data.title === 'string'
      ? data.title
      : ''
    const detail = data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' && data.detail
      ? data.detail
      : data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : ''
    throw new ApiError(response.status, detail, title)
  }
  return data as Response
}

const user = shallowRef<SessionUser | null>(null)
let restored = false
let restoring: Promise<void> | undefined
let sessionVersion = 0

function setUser(value: SessionUser | null) {
  sessionVersion += 1
  restored = true
  user.value = value ? {
    id: value.id,
    name: value.name,
    email: value.email,
    access: value.access,
    created_at: value.created_at,
    updated_at: value.updated_at
  } : null
}

async function restoreSession() {
  if (restored) return
  if (!restoring) {
    const version = sessionVersion
    restoring = apiRequest<SessionUser>('/user')
      .then(value => {
        if (version === sessionVersion) setUser(value)
      })
      .catch((error: unknown) => {
        if (version !== sessionVersion) return
        if (error instanceof ApiError && error.status === 401) setUser(null)
        else throw error
      })
      .finally(() => {
        restoring = undefined
      })
  }
  await restoring
}

const access = computed<string[]>(() => {
  try {
		const value: unknown = JSON.parse(user.value?.access ?? '[]')
		return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : []
  } catch {
		return []
  }
})
const canViewAdmin = computed(() => access.value.some(value => value === 'admin' || value === 'viewall'))
const canManageUsers = computed(() => access.value.includes('admin'))

export function safeLocalRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return '/'
  }
  if (decoded.startsWith('//') || /[\\\u0000-\u0020]/.test(decoded)) return '/'
  const target = new URL(value, location.origin)
  if (target.origin !== location.origin || /^\/(user\/(login|register|reset-password)|settings\/exit)\/?$/i.test(target.pathname)) return '/'
  return `${target.pathname}${target.search}${target.hash}`
}

function clearAccessibleCookies() {
  const pathParts = location.pathname.split('/')
  const paths = new Set(['/'])
  while (pathParts.length > 1) {
    paths.add(pathParts.join('/') || '/')
    paths.add(`${pathParts.join('/')}/`)
    pathParts.pop()
  }
  const hostParts = location.hostname.split('.')
  const domains = ['']
  while (hostParts.length) {
    domains.push(`; Domain=${hostParts.join('.')}`, `; Domain=.${hostParts.join('.')}`)
    hostParts.shift()
  }
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (!name) continue
    for (const path of paths) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=${path}${domain}${location.protocol === 'https:' ? '; Secure' : ''}`
      }
    }
  }
}

async function logout() {
  try {
    await apiRequest<{ message: string }>('/user/logout', {})
  } finally {
    setUser(null)
    clearAccessibleCookies()
  }
}

export function useAuth() {
	return { user: readonly(user), canViewAdmin, canManageUsers, setUser, restoreSession, logout }
}