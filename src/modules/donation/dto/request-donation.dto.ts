import { DonationStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

export const requestDonationSchema = z.object({
  amount: z
    .number({
      required_error: 'O valor é obrigatório.',
      invalid_type_error: 'O valor deve ser um número.',
    })
    .positive('O valor deve ser positivo.')
    .min(0.01, { message: 'O valor deve ser maior que 0.' }),
  institutionId: z
    .number({
      invalid_type_error: 'O id da instituição deve ser um número inteiro.',
    })
    .int('O id da instituição deve ser um número inteiro.')
    .positive('O id da instituição deve ser positivo.')
    .optional(),
  projectId: z
    .number({
      invalid_type_error: 'O id do projeto deve ser um número inteiro.',
    })
    .int('O id do projeto deve ser um número inteiro.')
    .positive('O id do projeto deve ser positivo.')
    .optional(),
  description: z
    .string({ invalid_type_error: 'A descrição deve ser uma string.' })
    .max(25, { message: 'A descrição deve ter no máximo 25 aracteres.' })
    .optional(),
})

export type DonationRequestBody = z.infer<typeof requestDonationSchema>

export interface DonationResponse {
  id: number
  amount: Decimal
  createdAt: Date
  updatedAt: Date
  status: DonationStatus
  paymentTransactionId: string
  paymentCheckoutUrl: string
  projectId: number | null
  institutionId: number | null
  donorId: number
  donor: {
    account: {
      name: string
    }
  }
}
