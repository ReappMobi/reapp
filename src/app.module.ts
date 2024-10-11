import { Module } from '@nestjs/common';
import { AccountModule } from './modules/account/account.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { MediaAttachmentModule } from './modules/mediaAttachment/media-attachment.module';
import { BullModule } from '@nestjs/bull';
import { MediaProcessingModule } from './modules/mediaAttachment/media-processing.module';
import { PostModule } from './modules/post/post.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    AccountModule,
    AuthenticationModule,
    MediaAttachmentModule,
    MediaProcessingModule,
    PostModule,
  ],
})
export class AppModule {}
