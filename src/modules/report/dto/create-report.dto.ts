import { z } from 'zod'

export const createReportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'ACCOUNT']),
  targetId: z.number().int().positive(),
  reason: z.enum([
    'SPAM',
    'INAPPROPRIATE',
    'HARASSMENT',
    'MISINFORMATION',
    'OTHER',
  ]),
  details: z.string().max(500).optional(),
})

export type CreateReportDto = z.infer<typeof createReportSchema>
