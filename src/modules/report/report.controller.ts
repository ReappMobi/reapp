import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { CreateReportDto } from './dto/create-report.dto'
import { ReportService } from './report.service'

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() request: any, @Body() dto: CreateReportDto) {
    const reporterId = request.user.id
    const report = await this.reportService.create(reporterId, dto)
    return { message: 'Denúncia registrada com sucesso', report }
  }
}
