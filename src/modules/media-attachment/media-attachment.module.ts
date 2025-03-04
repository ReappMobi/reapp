import { PrismaService } from '@app/database/prisma.service'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthGuard } from '../auth/auth.guard'
import { MediaAttachmentController } from './media-attachment.controller'
import { MediaService } from './media-attachment.service'

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
  controllers: [MediaAttachmentController],
  providers: [MediaService, PrismaService, AuthGuard],
  exports: [MediaService],
})
export class MediaAttachmentModule {}
