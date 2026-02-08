import { ZodValidationPipe } from '@app/common/zod.validation.pipe'
import { Body, Controller, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto, LoginSchema } from './dto/login.dto'
import { LoginGoogleDto } from './dto/loginGoogle.dto'

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto) {
    return await this.authService.login(loginDto)
  }

  @Post('login-google')
  async loginWithGoogle(@Body() loginGoogleDto: LoginGoogleDto) {
    return await this.authService.loginWithGoogle(loginGoogleDto)
  }
}
