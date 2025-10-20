import * as path from 'node:path'
import { ConfigModule } from '@app/config/config.module'
import { ConfigService } from '@app/config/config.service'
import { MailerModule } from '@nestjs-modules/mailer'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
import { Module } from '@nestjs/common'
import { MailService } from './mail.service'

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.EMAIL_HOST,
          port: configService.EMAIL_PORT,
          secure: false,
          auth: {
            user: configService.EMAIL_USER,
            pass: configService.EMAIL_PASSWORD,
          },
        },
        defaults: {
          from: configService.EMAIL_FROM,
        },
        template: {
          dir: path.join(process.cwd(), 'dist', 'modules', 'mail', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
