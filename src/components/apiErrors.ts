import { ApiError } from '../composables/useAuth'

export interface ApiErrorContent {
  title?: string
  description?: string
}

export function apiErrorContent(error: unknown, fallback: string): ApiErrorContent {
  if (error instanceof ApiError && (error.title || error.detail || error.errors.length)) {
    const fields = error.errors.map(field => field.location ? `${field.location}: ${field.message}` : field.message)
    return {
      title: error.title || undefined,
      description: [error.detail, ...fields].filter(Boolean).join('; ') || undefined
    }
  }
  return { description: fallback }
}