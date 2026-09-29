import { ApiError } from '../composables/useAuth'
import type { TranslationKey } from '../i18n/locales'

const errorKeys: Record<string, TranslationKey> = {
  'invalid or expired captcha': 'invalidCaptcha',
  'captcha is unavailable': 'captchaUnavailable',
  'invalid or expired email code; request a new code': 'invalidEmailCode',
  'invalid email or password': 'invalidCredentials',
  'email is already registered': 'emailAlreadyRegistered',
  'invalid email address': 'invalidEmail',
  'unable to send verification email': 'emailSendFailed',
  'email verification is unavailable': 'emailVerificationUnavailable',
  'wait 30 seconds before requesting another email': 'emailCooldown',
  'login is unavailable': 'loginUnavailable',
  'registration is unavailable': 'registrationUnavailable',
  'password reset is unavailable': 'resetUnavailable',
  'unable to reset password': 'resetFailed',
  'login required': 'loginRequired',
  'valid API token or login cookie required': 'loginRequired',
  'password must contain at least 8 characters and at most 72 bytes': 'invalidPassword',
  'validation failed': 'validationFailed'
}

export function authErrorKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) return 'networkError'
  const key = errorKeys[error.message]
  if (key) return key
  if (error.status === 429) return 'tooManyRequests'
  if (error.status === 401) return 'invalidCredentials'
  if (error.status === 422) return 'validationFailed'
  return 'requestFailed'
}