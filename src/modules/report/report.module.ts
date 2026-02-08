import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PrismaService } from '../../database/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { ReportController } from './report.controller'
import { ReportService } from './report.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ReportController],
  providers: [ReportService, PrismaService, AuthGuard],
})
export class ReportModule {}
