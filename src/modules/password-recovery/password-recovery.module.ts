import { PrismaService } from '@app/database/prisma.service'
import { Module } from '@nestjs/common'
import { MailService } from '../mail/mail.service'
import { PasswordRecoveryController } from './password-recovery.controller'
import { PasswordRecoveryService } from './password-recovery.service'

@Module({
  controllers: [PasswordRecoveryController],
  providers: [PasswordRecoveryService, PrismaService, MailService],
})
export class PasswordRecoveryModule {}
