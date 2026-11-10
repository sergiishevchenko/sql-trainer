import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'validation.username.min')
  .max(32, 'validation.username.max')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'validation.username.format')

export const emailSchema = z.string().trim().max(254, 'validation.email.invalid').email('validation.email.invalid')

export const passwordSchema = z
  .string()
  .min(8, 'validation.password.min')
  .max(128, 'validation.password.max')
  .regex(/[A-Za-zА-Яа-яЁё]/, 'validation.password.letter')
  .regex(/\d/, 'validation.password.digit')

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.password.mismatch'
  })

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'validation.required').max(254),
  password: z.string().min(1, 'validation.required').max(128),
  remember: z.boolean().default(false)
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'validation.required').max(128),
  newPassword: passwordSchema
})

export const recoverSchema = z.object({
  identifier: z.string().trim().min(1, 'validation.required').max(254),
  recoveryCode: z
    .string()
    .trim()
    .min(8, 'validation.recovery.format')
    .max(64, 'validation.recovery.format'),
  newPassword: passwordSchema
})

export const passwordConfirmSchema = z.object({
  password: z.string().min(1, 'validation.required').max(128)
})

export const updateProfileSchema = z.object({
  username: usernameSchema,
  email: emailSchema
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.input<typeof loginSchema>
