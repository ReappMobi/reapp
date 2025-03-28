import { PrismaService } from '@app/database/prisma.service'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AccountService } from '../account/account.service'
import { AuthGuard } from '../auth/auth.guard'
import { MediaService } from '../media-attachment/media-attachment.service'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    BullModule.registerQueue({
      name: 'media-processing',
    }),
  ],
  controllers: [ProjectController],
  providers: [
    ProjectService,
    PrismaService,
    AuthGuard,
    MediaService,
    AccountService,
  ],
})
export class ProjectModule {}
