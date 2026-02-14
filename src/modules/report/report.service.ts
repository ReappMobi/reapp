import { Injectable } from '@nestjs/common'
import { Report } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { IApiResponse } from '../../types/api-response'
import { CreateReportData } from './dto/create-report.dto'

@Injectable()
export class ReportService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    reporterId: number,
    { details, reason, targetId, targetType }: CreateReportData,
  ): Promise<IApiResponse<Report>> {
    const report = await this.prismaService.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason,
        details,
      },
    })

    return {
      success: true,
      message: 'Denúncia registrada com sucesso.',
      data: report,
    }
  }
}
