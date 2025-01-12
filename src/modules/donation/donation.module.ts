import { Module } from '@nestjs/common';
import { DonationService } from './donation.service';
import { DonationController } from './donation.controller';
import { PrismaService } from '../..//database/prisma.service';
import { MercadopagoService } from '../../services/mercadopago/mercadopago.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [DonationService, PrismaService, MercadopagoService],
  controllers: [DonationController],
})
export class DonationModule {}
