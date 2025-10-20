import { ZodValidationPipe } from '@app/common/zod.validation.pipe'
import { Body, Controller, Post, Query } from '@nestjs/common'
import {
  PasswordRecoveryDto,
  passwordRecoverySchema,
} from './dto/password-recovery.dto'
import {
  SendRecoveryEmailDto,
  sendRecoveryEmailSchema,
} from './dto/send-recovery-email.dto'
import { PasswordRecoveryService } from './password-recovery.service'

@Controller('password-recovery')
export class PasswordRecoveryController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Post()
  async recoveryPassword(
    @Body(new ZodValidationPipe(passwordRecoverySchema))
    { token, code }: PasswordRecoveryDto,
  ) {
    return this.passwordRecoveryService.recoveryPassword(token, code)
  }

  @Post('send-email')
  async sendRecoveryEmail(
    @Body(new ZodValidationPipe(sendRecoveryEmailSchema)) {
      email,
    }: SendRecoveryEmailDto,
  ) {
    return this.passwordRecoveryService.sendRecoveryEmail(email)
  }
}
