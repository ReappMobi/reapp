import { Module } from '@nestjs/common';
import { MediaAttachmentController } from './media-attachment.controller';
import { MediaService } from './media-attachment.service';
import { PrismaService } from 'src/database/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';

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
