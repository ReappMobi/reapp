import { Test, TestingModule } from '@nestjs/testing'
import { ReportReason, ReportTargetType } from '@prisma/client'
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../../../database/prisma.service'
import { CreateReportData } from '../dto/create-report.dto'
import { ReportService } from '../report.service'

describe('ReportService', () => {
  let service: ReportService

  const mockPrismaService = {
    report: {
      create: vi.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<ReportService>(ReportService)
    vi.clearAllMocks()
  })

  it('should create a report and return a success response', async () => {
    const reporterId = 10
    const dto: CreateReportData = {
      targetType: 'POST',
      targetId: 20,
      reason: 'SPAM',
      details: 'Conteudo suspeito.',
    }

    const report = {
      id: 'rep_1',
      reporterId,
      targetType: ReportTargetType.POST,
      targetId: dto.targetId,
      reason: ReportReason.SPAM,
      details: dto.details,
      resolved: false,
      createdAt: new Date('2026-02-08T00:00:00.000Z'),
    }
    ;(mockPrismaService.report.create as Mock).mockResolvedValue(report)

    const result = await service.create(reporterId, dto)

    expect(mockPrismaService.report.create).toHaveBeenCalledWith({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      },
    })
    expect(result).toEqual({
      success: true,
      message: 'Denúncia registrada com sucesso.',
      data: report,
    })
  })
})
