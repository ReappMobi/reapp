import { z } from 'zod'

export const LoginSchema = z.object({
  email: z
    .string({
      required_error: 'O email é obrigatório',
    })
    .email({ message: 'Email inválido' }),
  password: z
    .string({ required_error: 'A senha é obrigatória' })
    .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
})

export type LoginDto = z.infer<typeof LoginSchema>
