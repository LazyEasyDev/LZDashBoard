const apiURL = new URL(import.meta.env.VITE_API_URL || 'https://localhost')

if (apiURL.protocol !== 'https:') {
  throw new Error('VITE_API_URL must use HTTPS')
}

export const API_ORIGIN = apiURL.origin