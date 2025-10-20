import z from 'zod'

export const sendRecoveryEmailSchema = z.object({
  email: z.string().email(),
})
export type SendRecoveryEmailDto = z.infer<typeof sendRecoveryEmailSchema>
