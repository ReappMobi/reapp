import { PrismaService } from '@app/database/prisma.service'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AccountService } from '../account/account.service'
import { AuthGuard } from '../auth/auth.guard'
import { MediaService } from '../media-attachment/media-attachment.service'
import { PostController } from './post.controller'
import { PostService } from './post.service'

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
  providers: [
    PostService,
    PrismaService,
    AuthGuard,
    MediaService,
    AccountService,
  ],
})
export class PostModule {}
