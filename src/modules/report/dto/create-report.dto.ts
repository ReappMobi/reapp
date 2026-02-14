import { ReportReason, ReportTargetType } from '@prisma/client'
import { z } from 'zod'

export const createReportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.number().int().positive(),
  reason: z.nativeEnum(ReportReason),
  details: z.string().max(500).optional(),
})

export type CreateReportData = z.infer<typeof createReportSchema>
