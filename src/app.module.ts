import { Module } from '@nestjs/common';
import { AccountModule } from './modules/account/account.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { MediaAttachmentModule } from './modules/mediaAttachment/media-attachment.module';
import { BullModule } from '@nestjs/bull';
import { MediaProcessingModule } from './modules/mediaAttachment/media-processing.module';
import { PostModule } from './modules/post/post.module';
import { ProjectModule } from './modules/project/project.module';
import { InstitutionMemberModule } from './modules/institutionMember/institutionMember.module';

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
    ProjectModule,
    InstitutionMemberModule,
  ],
})
export class AppModule {}
