import { Controller, Post, Body, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { LoginGoogleDto } from './dto/loginGoogle.dto'
import { HttpException } from '@nestjs/common'

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      return await this.authService.login(loginDto)
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post('login-google')
  async loginWithGoogle(@Body() loginGoogleDto: LoginGoogleDto) {
    try {
      return await this.authService.loginWithGoogle(loginGoogleDto)
    } catch (error) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
