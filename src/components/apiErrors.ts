import { ApiError } from '../composables/useAuth'

export interface ApiErrorContent {
  title?: string
  description?: string
}

export function apiErrorContent(error: unknown, fallback: string): ApiErrorContent {
  if (error instanceof ApiError && (error.title || error.detail)) {
    return {
      title: error.title || undefined,
      description: error.detail || undefined
    }
  }
  return { description: fallback }
}