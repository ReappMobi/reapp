import { Module } from '@nestjs/common';
import { InstitutionMemberController } from './institutionMember.controller';
import { InstitutionMemberService } from './institutionMember.service';
import { AccountService } from '../account/account.service';
import { PrismaService } from '../../database/prisma.service';
import { MediaService } from '../media-attachment/media-attachment.service';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    BullModule.registerQueue({
      name: 'media-processing',
    }),
  ],
  controllers: [InstitutionMemberController],
  providers: [
    InstitutionMemberService,
    AccountService,
    PrismaService,
    MediaService,
    AuthGuard,
  ],
})
export class InstitutionMemberModule {}
