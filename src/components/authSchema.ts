import { z } from 'zod'

export function createAuthSchemas(mode: 'login' | 'register' | 'reset', translate: (key: string) => string) {
  const isLogin = mode === 'login'
  const password = z.string().min(1, translate('required'))
  const code = z.string().trim().min(1, translate('required')).regex(/^[0-9]{6}$/, translate('invalidCode'))
  const fields = z.object({
    name: z.string().trim().refine(value => [...value].length <= 100, translate('nameTooLong')),
    email: z.string().trim().min(1, translate('required')).pipe(z.email(translate('invalidEmail'))),
    password: isLogin ? password : password
      .refine(value => [...value].length >= 8, translate('passwordTooShort'))
      .refine(value => new TextEncoder().encode(value).length <= 72, translate('passwordTooLong')),
    confirmation: isLogin ? z.string() : z.string().min(1, translate('required')),
    email_code: isLogin ? z.string() : code,
    captcha: code
  })

  return {
    form: fields.refine(value => isLogin || value.password === value.confirmation, {
      path: ['confirmation'],
      message: translate('passwordMismatch')
    }),
    emailCode: fields.pick({ email: true, captcha: true })
  }
}