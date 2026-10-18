import { apiRequest } from './useAuth'

let captureSequence = 0
let acceptedSequence = 0

export const referralChannelPattern = '^[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]$'

export function isReferralChannel(value: string): boolean {
  return new RegExp(referralChannelPattern).exec(value)?.[0] === value
}

function isReferralToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 128
    && /^A[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+Z$/.exec(value)?.[0] === value
}

export async function captureReferral(value: unknown): Promise<void> {
  if (!isReferralToken(value)) return
  const sequence = ++captureSequence
  try {
    const result = await apiRequest<{ cookie_max_age_seconds: number }>('/user/config')
    if (sequence < acceptedSequence) return
    if (!Number.isInteger(result.cookie_max_age_seconds) || result.cookie_max_age_seconds <= 0
      || result.cookie_max_age_seconds > 400 * 24 * 60 * 60) {
      throw new Error('Invalid referral cookie lifetime')
    }
    acceptedSequence = sequence
    document.cookie = `ref=${value}; Max-Age=${result.cookie_max_age_seconds}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  } catch (error: unknown) {
    console.warn('Unable to capture referral', error)
    return
  }
}

export function clearReferralCookie(): void {
  acceptedSequence = ++captureSequence
  document.cookie = `ref=; Max-Age=0; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
}

export function readReferralCookie(): string {
  const matches = document.cookie.split(';')
    .map(cookie => cookie.trim())
    .filter(cookie => cookie.startsWith('ref='))
  if (matches.length === 0) return ''
  if (matches.length !== 1) {
    clearReferralCookie()
    return ''
  }
  try {
    const value = decodeURIComponent(matches[0]!.slice(4))
    if (isReferralToken(value)) return value
  } catch {
    // Malformed cookie encoding is an invalid referral, not a registration error.
  }
  clearReferralCookie()
  return ''
}

export async function generateReferralLink(channel: string): Promise<string> {
  if (!isReferralChannel(channel)) throw new Error('Invalid referral channel')
  const result = await apiRequest<{ ref: string }>('/user/ref', { channel })
  if (!isReferralToken(result.ref)) throw new Error('Invalid referral token')
  const link = new URL('/user/register', location.origin)
  link.searchParams.set('ref', result.ref)
  link.searchParams.set('channel', channel)
  return link.href
}