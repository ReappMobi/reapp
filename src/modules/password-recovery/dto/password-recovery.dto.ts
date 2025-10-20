import z from 'zod'

export const passwordRecoverySchema = z.object({
  token: z.string().uuid({ message: 'Token inválido' }),
  code: z
    .string()
    .regex(/^\d{6}$/, { message: 'Código inválido' })
    .length(6),
})

export type PasswordRecoveryDto = z.infer<typeof passwordRecoverySchema>
