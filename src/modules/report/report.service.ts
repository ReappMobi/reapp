import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { CreateReportDto } from './dto/create-report.dto'

@Injectable()
export class ReportService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(reporterId: number, dto: CreateReportDto) {
    const report = await this.prismaService.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      },
    })

    return {
      success: true,
      message: 'Denúncia registrada com sucesso.',
      data: report,
    }
  }
}
