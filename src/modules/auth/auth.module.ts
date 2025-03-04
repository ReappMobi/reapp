import { PrismaService } from '@app/database/prisma.service'
import { Module } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { AuthenticationController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [AuthService, PrismaService, JwtService],
  exports: [AuthService],
})
export class AuthenticationModule {}
