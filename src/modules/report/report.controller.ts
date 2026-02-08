import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { RequestWithUser } from '../../types/request-with-user'
import { ZodValidationPipe } from '../../common/zod.validation.pipe'
import { AuthGuard } from '../auth/auth.guard'
import { CreateReportDto, createReportSchema } from './dto/create-report.dto'
import { ReportService } from './report.service'

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Req() request: RequestWithUser,
    @Body(new ZodValidationPipe(createReportSchema)) dto: CreateReportDto,
  ) {
    const reporterId = request.user.id
    return this.reportService.create(reporterId, dto)
  }
}
