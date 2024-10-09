import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MediaProcessingService } from './media-processing.service';
import { PrismaService } from 'src/database/prisma.service';
import { MediaService } from './media-attachment.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'media-processing',
    }),
  ],
  providers: [MediaProcessingService, PrismaService, MediaService],
})
export class MediaProcessingModule {}
