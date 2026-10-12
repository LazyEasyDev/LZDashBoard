import { apiRequest } from './useAuth'

const referralCookieMaxAge = 400 * 24 * 60 * 60
let captureSequence = 0
let acceptedSequence = 0

function isReferralToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 128
    && /^A[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+Z$/.test(value)
}

export async function captureReferral(value: unknown): Promise<void> {
  if (!isReferralToken(value)) return
  const sequence = ++captureSequence
  try {
    const query = new URLSearchParams({ ref: value })
    const result = await apiRequest<{ valid: boolean }>(`/user/ref?${query}`)
    if (result.valid !== true || sequence < acceptedSequence) return
    acceptedSequence = sequence
    document.cookie = `ref=${value}; Max-Age=${referralCookieMaxAge}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  } catch {
    return
  }
}

export function readReferralCookie(): string {
  const matches = document.cookie.split(';')
    .map(cookie => cookie.trim())
    .filter(cookie => cookie.startsWith('ref='))
  if (matches.length !== 1) return ''
  try {
    const value = decodeURIComponent(matches[0]!.slice(4))
    return isReferralToken(value) ? value : ''
  } catch {
    return ''
  }
}

export async function generateReferralLink(): Promise<string> {
  const randomByte = new Uint8Array(1)
  const letterLimit = 256 - (256 % 26)
  let tag = ''
  while (tag.length < 5) {
    crypto.getRandomValues(randomByte)
    const value = randomByte[0]!
    if (value < letterLimit) tag += String.fromCharCode(97 + value % 26)
  }
  const result = await apiRequest<{ ref: string }>('/user/ref', { tag })
  if (!isReferralToken(result.ref)) throw new Error('Invalid referral token')
  const link = new URL('/user/register', location.origin)
  link.searchParams.set('ref', result.ref)
  link.searchParams.set('reference_channel', tag)
  return link.href
}