import { PrismaService } from '@app/database/prisma.service'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { MediaService } from '../media-attachment/media-attachment.service'
import { MediaProcessingService } from './media-processing.service'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'media-processing',
    }),
  ],
  providers: [MediaProcessingService, PrismaService, MediaService],
})
export class MediaProcessingModule {}
