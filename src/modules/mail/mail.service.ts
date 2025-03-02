import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { Account } from '@prisma/client'

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendUserConfirmation(account: Account, token: string) {
    const url = `example.com/auth/confirm?token=${token}`

    await this.mailerService.sendMail({
      to: account.email,
      subject: 'Welcome to Nice App! Confirm your Email',
      template: './confirmation',
      context: {
        name: account.name,
        url,
      },
    })
  }

  async sendRecoveryEmail(account: Account, code: string) {
    await this.mailerService.sendMail({
      to: account.email,
      subject: 'Reapp - Recuperar senha',
      template: './recovery',
      context: {
        name: account.name,
        code,
      },
    })
  }
}
