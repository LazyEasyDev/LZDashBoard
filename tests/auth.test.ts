import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createAuthSchemas } from '../src/components/authSchema'
import type { SessionUser } from '../src/composables/useAuth'

const profile: SessionUser & { api_token: string, password: string } = {
  id: 1,
  name: null,
  email: 'member@example.test',
  access: '[]',
  api_token: 'never-store-this-token',
  password: '',
  created_at: '2026-09-29T00:00:00Z',
  updated_at: '2026-09-29T00:00:00Z'
}

let auth: typeof import('../src/composables/useAuth')
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>
let cookieWrites: string[]

beforeEach(async () => {
  vi.resetModules()
  auth = await import('../src/composables/useAuth')
  fetchMock = vi.fn<typeof fetch>()
  cookieWrites = []
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('location', new URL('https://dashboard.example.test/settings/exit'))
  vi.stubGlobal('document', {
    get cookie() { return 'preference=value; api_token=legacy' },
    set cookie(value: string) { cookieWrites.push(value) }
  })
})

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}

async function routerWithGuard() {
  const { authGuard } = await import('../src/authGuard')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...['/', '/user/login', '/user/register', '/user/reset-password', '/admin/users', '/admin/dbkv', '/settings/exit'].map(path => ({
        path,
        component: { render: () => null }
      })),
      {
        path: '/:path(.*)*',
        name: 'not-found',
        meta: { layout: false },
        component: { render: () => null }
      }
    ]
  })
  router.beforeEach(authGuard)
  return router
}

describe('API requests', () => {
  it('uses the configured API origin and credentialed JSON POSTs', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'ok' }))
    await expect(auth.apiRequest('/user/logout', {})).resolves.toEqual({ message: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith('https://localhost/user/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: expect.any(AbortSignal)
    }))
  })

  it('uses credentialed POST requests with the user ID in the update body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }))
    await expect(auth.apiRequest('/admin/users/update', { id: 7, name: 'Updated' })).resolves.toEqual({ id: 7 })
    expect(fetchMock).toHaveBeenCalledWith('https://localhost/admin/users/update', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"id":7,"name":"Updated"}'
    }))
  })

  it('lists users with pagination and filters on the list endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
    await auth.apiRequest('/admin/users/list?page=2&page_size=20&access=user')
    expect(fetchMock).toHaveBeenCalledWith('https://localhost/admin/users/list?page=2&page_size=20&access=user', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      body: undefined
    }))
  })

  it('creates users on the create endpoint without an ID', async () => {
    const body = { name: 'Member', email: 'member@example.test', password: '12345678', access: ['user'] }
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }, 201))
    await expect(auth.apiRequest('/admin/users/create', body)).resolves.toEqual({ id: 7 })
    expect(fetchMock).toHaveBeenCalledWith('https://localhost/admin/users/create', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(body)
    }))
  })

  it('preserves backend errors and tolerates non-JSON error responses', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Invalid code' }, 400))
    await expect(auth.apiRequest('/user/login', {})).rejects.toMatchObject({ status: 400, message: 'Invalid code' })
    fetchMock.mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }))
    await expect(auth.apiRequest('/user')).rejects.toMatchObject({ status: 502, message: '' })
  })

  it.each([
    [{ detail: 'Invalid code', status: 422, errors: [] }, 'Invalid code'],
    [{ message: 'Legacy error', detail: 'Huma error' }, 'Huma error'],
    [{ message: '', detail: 'Huma error' }, 'Huma error'],
    [{ message: 123, detail: 'Huma error' }, 'Huma error'],
    [{ detail: 123, errors: [] }, ''],
    [null, '']
  ])('extracts a safe error message from %j', async (body, message) => {
    fetchMock.mockResolvedValue(jsonResponse(body, 400))
    const request = auth.apiRequest('/user/login', {})
    await expect(request).rejects.toBeInstanceOf(auth.ApiError)
    await expect(request).rejects.toMatchObject({ status: 400, message })
  })

  it.each([
    [{ title: 'Unauthorized', detail: 'invalid email or password' }, 'Unauthorized', 'invalid email or password'],
    [{ title: 'Service Unavailable', detail: 'Please contact support.' }, 'Service Unavailable', 'Please contact support.'],
    [{ title: 'Forbidden' }, 'Forbidden', ''],
    [{ detail: 'Custom API error' }, '', 'Custom API error'],
    [{ title: 123, detail: ['invalid'] }, '', ''],
    [null, '', '']
  ])('preserves safe problem title and detail from %j', async (body, title, detail) => {
    fetchMock.mockResolvedValue(jsonResponse(body, 400))
    await expect(auth.apiRequest('/user/login', {})).rejects.toMatchObject({
      status: 400,
      title,
      detail,
      message: detail || title
    })
  })
})

describe('API error alerts', () => {
  it.each([
    ['Unauthorized', 'invalid email or password'],
    ['Service Unavailable', 'An unmapped backend error'],
    ['Forbidden', ''],
    ['', 'Detail without a title'],
    ['<b>Unauthorized</b>', '<script>alert(1)</script>']
  ])('shows the returned title %j and detail %j without replacing them', async (title, detail) => {
    const { apiErrorContent } = await import('../src/components/apiErrors')
    const { authErrorKey } = await import('../src/components/authErrors')
    fetchMock.mockResolvedValue(jsonResponse({ title, detail }, 401))
    const error = await auth.apiRequest('/user/login', {}).catch((error: unknown) => error)
    expect(apiErrorContent(error, authErrorKey(error))).toEqual({
      title: title || undefined,
      description: detail || undefined
    })
  })

  it.each([
    [429, 'tooManyRequests'],
    [401, 'invalidCredentials'],
    [422, 'validationFailed'],
    [502, 'requestFailed']
  ])('keeps the status fallback for an empty API error with status %i', async (status, fallback) => {
    const { apiErrorContent } = await import('../src/components/apiErrors')
    const { authErrorKey } = await import('../src/components/authErrors')
    const error = new auth.ApiError(status, '')
    expect(apiErrorContent(error, authErrorKey(error))).toEqual({ description: fallback })
  })

  it('keeps localized network and page-specific fallbacks', async () => {
    const { apiErrorContent } = await import('../src/components/apiErrors')
    const { authErrorKey } = await import('../src/components/authErrors')
    const error = new TypeError('Failed to fetch')
    expect(apiErrorContent(error, authErrorKey(error))).toEqual({ description: 'networkError' })
    expect(apiErrorContent(error, 'Unable to load users')).toEqual({ description: 'Unable to load users' })
  })
})

const validForm = {
  name: '',
  email: 'member@example.test',
  password: '12345678',
  confirmation: '12345678',
  email_code: '012345',
  captcha: '012345'
}
const supplementaryCharacter = String.fromCodePoint(0x1f511)
const threeByteCharacter = String.fromCodePoint(0x754c)

describe.each(['register', 'reset'] as const)('%s validation', mode => {
  const { form } = createAuthSchemas(mode, key => key)

  it.each([
    '12345678', 'a'.repeat(72), supplementaryCharacter.repeat(8),
    supplementaryCharacter.repeat(18), threeByteCharacter.repeat(24)
  ])('accepts a password within code-point and byte limits: %j', password => {
    expect(form.safeParse({ ...validForm, password, confirmation: password }).success).toBe(true)
  })

  it.each([
    ['1234567', 'passwordTooShort'],
    [supplementaryCharacter.repeat(7), 'passwordTooShort'],
    ['a'.repeat(73), 'passwordTooLong'],
    [supplementaryCharacter.repeat(18) + 'a', 'passwordTooLong'],
    [threeByteCharacter.repeat(25), 'passwordTooLong']
  ])('rejects a password outside the limits: %j', (password, message) => {
    const result = form.safeParse({ ...validForm, password, confirmation: password })
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['password'], message }))
  })

  it.each(['email', 'password', 'confirmation', 'email_code', 'captcha'])('requires %s', field => {
    const result = form.safeParse({ ...validForm, [field]: '' })
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: [field], message: 'required' }))
  })

  it('requires matching password confirmation', () => {
    const result = form.safeParse({ ...validForm, confirmation: 'different' })
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['confirmation'], message: 'passwordMismatch' }))
  })

  it.each(['a', supplementaryCharacter])('limits an optional name to 100 code points: %j', character => {
    expect(form.safeParse({ ...validForm, name: character.repeat(100) }).success).toBe(true)
    const result = form.safeParse({ ...validForm, name: character.repeat(101) })
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['name'], message: 'nameTooLong' }))
  })

  it.each(['12345', '1234567', '12a456', '12 456', String.fromCodePoint(0xff11).repeat(6)])('rejects malformed email code %j', email_code => {
    const result = form.safeParse({ ...validForm, email_code })
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: ['email_code'], message: 'invalidCode' }))
  })
})

describe.each(['login', 'register', 'reset'] as const)('%s captcha validation', mode => {
  const schemas = createAuthSchemas(mode, key => key)

  it.each(['', '12345', '1234567', '12a456', '12 456', String.fromCodePoint(0x661).repeat(6)])('rejects malformed captcha %j in both flows', captcha => {
    expect(schemas.form.safeParse({ ...validForm, captcha }).success).toBe(false)
    expect(schemas.emailCode.safeParse({ email: validForm.email, captcha }).success).toBe(false)
  })

  it('accepts trimmed six-digit codes and preserves leading zeros', () => {
    expect(schemas.form.parse({ ...validForm, captcha: ' 012345 ', email_code: '012345' })).toMatchObject({ captcha: '012345', email_code: '012345' })
    expect(schemas.emailCode.parse({ email: ' member@example.test ', captcha: ' 012345 ' })).toEqual({ email: validForm.email, captcha: '012345' })
  })
})

describe('login validation', () => {
  const { form } = createAuthSchemas('login', key => key)

  it('allows a one-character legacy password without confirmation or email code', () => {
    expect(form.safeParse({ ...validForm, password: '1', confirmation: '', email_code: '' }).success).toBe(true)
  })

  it.each(['email', 'password', 'captcha'])('requires %s', field => {
    const result = form.safeParse({ ...validForm, [field]: '' })
    expect(result.error?.issues).toContainEqual(expect.objectContaining({ path: [field], message: 'required' }))
  })
})

describe('memory-only session', () => {
  it('deduplicates restore requests and discards returned token and password fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse(profile))
    const session = auth.useAuth()
    await Promise.all([session.restoreSession(), session.restoreSession()])
    await session.restoreSession()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://localhost/user', expect.objectContaining({ method: 'GET', credentials: 'include' }))
    expect(session.user.value?.email).toBe(profile.email)
    expect(session.user.value).not.toHaveProperty('api_token')
    expect(session.user.value).not.toHaveProperty('password')
  })

  it('treats a 401 as an anonymous session', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    const session = auth.useAuth()
    await expect(session.restoreSession()).resolves.toBeUndefined()
    expect(session.user.value).toBeNull()
  })

  it('allows retry after a network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(jsonResponse(profile))
    const session = auth.useAuth()
    await expect(session.restoreSession()).rejects.toThrow('offline')
    await session.restoreSession()
    expect(session.user.value?.id).toBe(profile.id)
  })

  it('does not overwrite a newer login with a stale restore response', async () => {
    let resolveResponse!: (response: Response) => void
    fetchMock.mockReturnValue(new Promise(resolve => { resolveResponse = resolve }))
    const session = auth.useAuth()
    const pending = session.restoreSession()
    session.setUser({ ...profile, email: 'new-login@example.test' })
    resolveResponse(jsonResponse(profile))
    await pending
    expect(session.user.value?.email).toBe('new-login@example.test')
  })

  it.each(['["admin"]', '["viewall"]', '["member","admin"]'])('permits exact admin access %s', access => {
    const session = auth.useAuth()
    session.setUser({ ...profile, access })
    expect(session.canViewAdmin.value).toBe(true)
  })

  it.each([
    ['["admin"]', true],
    ['["user","admin"]', true],
    ['["viewall"]', false],
    ['["user","viewall"]', false],
    ['["ADMIN"]', false]
  ])('limits user management for %s to admin=%s', (access, expected) => {
    const session = auth.useAuth()
    session.setUser({ ...profile, access })
    expect(session.canManageUsers.value).toBe(expected)
  })

  it.each(['[]', '["ADMIN"]', '["not-admin"]', '"admin"', '{"admin":true}', 'invalid', 'null'])('denies malformed or insufficient access %s', access => {
    const session = auth.useAuth()
    session.setUser({ ...profile, access })
    expect(session.canViewAdmin.value).toBe(false)
  })

  it.each([true, false])('clears memory and accessible cookies when server logout succeeds=%s', async succeeds => {
    const session = auth.useAuth()
    session.setUser(profile)
    if (succeeds) fetchMock.mockResolvedValue(jsonResponse({ message: 'Logged out' }))
    else fetchMock.mockRejectedValue(new TypeError('offline'))
    const result = session.logout()
    if (succeeds) await result
    else await expect(result).rejects.toThrow('offline')
    expect(session.user.value).toBeNull()
    expect(session.canViewAdmin.value).toBe(false)
    expect(cookieWrites).toContain('preference=; Max-Age=0; Path=/; Secure')
    expect(cookieWrites).toContain('api_token=; Max-Age=0; Path=/settings; Domain=.example.test; Secure')
    expect(fetchMock).toHaveBeenCalledWith('https://localhost/user/logout', expect.objectContaining({ body: '{}' }))
  })
})

describe('redirect safety', () => {
  it.each([
    undefined, ['/admin/users'], 'https://outside.example', '//outside.example',
    '/\\outside.example', '/%2foutside.example', '/%5coutside.example',
    '/%0aoutside.example', '/bad%', '/user/login', '/USER/LOGIN', '/user/register',
    '/user/reset-password', '/user/login/', '/user/other/../login', '/settings/exit', '/settings/other/../exit'
  ])('rejects unsafe or auth-loop destination %j', destination => {
    expect(auth.safeLocalRedirect(destination)).toBe('/')
  })

  it('preserves a local path, query, and hash', () => {
    expect(auth.safeLocalRedirect('/admin/users?sort=email#table')).toBe('/admin/users?sort=email#table')
  })
})

describe('route guard', () => {
  it.each(['/admin/users/asdfasfd', '/missing-page', '/user/missing/deep?from=test#section'])('shows the public not-found route for %s without restoring cookies', async path => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const router = await routerWithGuard()
    await router.push(path)
    expect(router.currentRoute.value.name).toBe('not-found')
    expect(router.currentRoute.value.fullPath).toBe(path)
    expect(router.currentRoute.value.meta.layout).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['[]', '["admin"]'])('keeps an unknown admin path on the not-found page for access %s', async access => {
    auth.useAuth().setUser({ ...profile, access })
    const router = await routerWithGuard()
    await router.push('/admin/users/asdfasfd')
    expect(router.currentRoute.value.name).toBe('not-found')
    expect(router.currentRoute.value.path).toBe('/admin/users/asdfasfd')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still protects real admin routes when leaving the not-found page', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    const router = await routerWithGuard()
    await router.push('/admin/users/asdfasfd')
    await router.push('/admin/users')
    expect(router.currentRoute.value.path).toBe('/user/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/users')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['/user/login', '/user/register', '/user/reset-password', '/settings/exit'])('allows public auth action %s without restoring cookies', async path => {
    const router = await routerWithGuard()
    await router.push(path)
    expect(router.currentRoute.value.path).toBe(path)
    expect(router.currentRoute.value.name).not.toBe('not-found')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('redirects anonymous deep links to login with the local destination', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    const router = await routerWithGuard()
    await router.push('/admin/users?sort=email')
    expect(router.currentRoute.value.path).toBe('/user/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/users?sort=email')
  })

  it.each(['/admin/users', '/Admin/users', '/admin/dbkv', '/Admin/dbkv'])('blocks direct admin navigation to %s for regular users', async path => {
    auth.useAuth().setUser(profile)
    const router = await routerWithGuard()
    await router.push(path)
    expect(router.currentRoute.value.path).toBe('/')
  })

  describe.each(['/admin/users', '/admin/dbkv'])('%s access', path => {
    it.each(['admin', 'viewall'])('allows admin routes for %s', async access => {
      fetchMock.mockResolvedValue(jsonResponse({ ...profile, access: JSON.stringify([access]) }))
      const router = await routerWithGuard()
      await router.push(path)
      expect(router.currentRoute.value.path).toBe(path)
    })
  })

  it('redirects a failed restore to a retryable login state', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const router = await routerWithGuard()
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/user/login')
    expect(router.currentRoute.value.query.session).toBe('unavailable')
  })
})