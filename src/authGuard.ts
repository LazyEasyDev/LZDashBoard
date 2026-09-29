import type { NavigationGuard } from 'vue-router'
import { useAuth } from './composables/useAuth'

const publicPaths = new Set(['/user/login', '/user/register', '/user/reset-password', '/settings/exit'])

export const authGuard: NavigationGuard = async to => {
  const path = to.path.replace(/\/+$/, '').toLowerCase() || '/'
  if (publicPaths.has(path)) return true

  const { user, restoreSession, canViewAdmin } = useAuth()
  try {
    await restoreSession()
  } catch {
    return { path: '/user/login', query: { redirect: to.fullPath, session: 'unavailable' }, replace: true }
  }
  if (!user.value) return { path: '/user/login', query: { redirect: to.fullPath }, replace: true }
  if ((path === '/admin' || path.startsWith('/admin/')) && !canViewAdmin.value) {
    return { path: '/', replace: true }
  }
  return true
}