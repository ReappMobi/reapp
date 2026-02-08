import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { ZodValidationPipe } from '../../common/zod.validation.pipe'
import { Request } from 'express'
import { AuthGuard } from '../auth/auth.guard'
import { CreateReportDto, createReportSchema } from './dto/create-report.dto'
import { ReportService } from './report.service'

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() request: Request,
    @Body(new ZodValidationPipe(createReportSchema)) dto: CreateReportDto,
  ) {
    const reporterId = request.user.id
    return this.reportService.create(reporterId, dto)
  }
}
