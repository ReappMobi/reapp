import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/database/prisma.service';
import { AuthenticationController } from './authentication.controller';
import { AuthService } from './authentication.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [AuthService, PrismaService],
  exports: [AuthService],
})
export class AuthenticationModule {}
