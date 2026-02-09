import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { ZodValidationPipe } from '../../common/zod.validation.pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CreateReportData, createReportSchema } from './dto/create-report.dto'
import { ReportService } from './report.service'

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() request: Request,
    @Body(new ZodValidationPipe(createReportSchema))
    createReportData: CreateReportData,
  ) {
    const reporterId = request.user.id
    return this.reportService.create(reporterId, createReportData)
  }
}
