import { Body, Controller, Get, Query } from '@nestjs/common'
import { PasswordRecoveryDto } from './dto/password-recovery.dto'
import { SendRecoveryEmailDto } from './dto/send-recovery-email.dto'
import { PasswordRecoveryService } from './password-recovery.service'

@Controller('password-recovery')
export class PasswordRecoveryController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Get()
  async recoveryPassword(@Query() query: PasswordRecoveryDto) {
    return this.passwordRecoveryService.recoveryPassword(
      query.token,
      query.code,
    )
  }

  @Get('send-email')
  async sendRecoveryEmail(@Query() query: SendRecoveryEmailDto) {
    return this.passwordRecoveryService.sendRecoveryEmail(query.email)
  }
}
