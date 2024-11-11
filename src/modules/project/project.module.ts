import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { PrismaService } from 'src/database/prisma.service';
import { AuthGuard } from '../authentication/authentication.guard';
import { MediaService } from '../mediaAttachment/media-attachment.service';
import { BullModule } from '@nestjs/bull';
import { AccountService } from '../account/account.service';

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
  controllers: [ProjectController],
  providers: [
    ProjectService,
    PrismaService,
    AuthGuard,
    MediaService,
    AccountService,
  ],
})
export class ProjectModule {}
