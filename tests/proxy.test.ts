import { describe, expect, it, vi } from 'vitest'
import type { ProxyOptions, UserConfigFnObject } from 'vite'
import config from '../vite.config'

function proxyConfig() {
  return (config as UserConfigFnObject)({ command: 'serve', mode: 'test' }).server!.proxy!
}

describe('development proxy', () => {
  it('strips the API prefix and preserves Host for all API/docs requests', () => {
    vi.stubEnv('LZAPP_API_TARGET', '')
    const proxies = proxyConfig()
    for (const path of ['/api', '/docs', '/docs_token', '/openapi.json']) {
      expect(proxies[path]).toMatchObject({ target: 'https://localhost:8443', changeOrigin: false, secure: false })
    }
    const api = proxies['/api'] as ProxyOptions
    expect(api.rewrite?.('/api/user/login')).toBe('/user/login')
    expect(api.rewrite?.('/api/user?query=value')).toBe('/user?query=value')
    expect(api.rewrite?.('/api')).toBe('/')
    expect((proxies['/docs'] as ProxyOptions).rewrite).toBeUndefined()
  })

  it('uses an environment override and verifies remote TLS certificates', () => {
    vi.stubEnv('LZAPP_API_TARGET', 'https://api.example.test:9443')
    expect(proxyConfig()['/api']).toMatchObject({
      target: 'https://api.example.test:9443', changeOrigin: false, secure: true
    })
  })
})