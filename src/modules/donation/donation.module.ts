import { Module } from '@nestjs/common';
import { DonationService } from './donation.service';
import { DonationController } from './donation.controller';
import { PrismaService } from '../..//database/prisma.service';
import { MercadopagoService } from '../../services/mercadopago/mercadopago.service';

@Module({
  providers: [DonationService, PrismaService, MercadopagoService],
  controllers: [DonationController],
})
export class DonationModule {}
