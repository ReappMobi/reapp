import { Module } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { AuthGuard } from '../authentication/authentication.guard';
import { MediaService } from '../mediaAttachment/media-attachment.service';
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
  controllers: [PostController],
  providers: [PostService, PrismaService, AuthGuard, MediaService],
})
export class PostModule {}
