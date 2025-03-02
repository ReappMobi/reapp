import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { redisConfig } from './config'
import { AccountModule } from './modules/account/account.module'
import { AuthenticationModule } from './modules/auth/auth.module'
import { DonationModule } from './modules/donation/donation.module'
import { InstitutionMemberModule } from './modules/institutionMember/institutionMember.module'
import { MailModule } from './modules/mail/mail.module'
import { MailService } from './modules/mail/mail.service'
import { MediaAttachmentModule } from './modules/media-attachment/media-attachment.module'
import { MediaProcessingModule } from './modules/media-processing/media-processing.module'
import { PasswordRecoveryModule } from './modules/password-recovery/password-recovery.module'
import { PostModule } from './modules/post/post.module'
import { ProjectModule } from './modules/project/project.module'

@Module({
  imports: [
    BullModule.forRoot({ redis: redisConfig }),
    AccountModule,
    AuthenticationModule,
    DonationModule,
    MediaAttachmentModule,
    MediaProcessingModule,
    PostModule,
    ProjectModule,
    InstitutionMemberModule,
    PasswordRecoveryModule,
    MailModule,
  ],
  providers: [MailService],
})
export class AppModule {}
