import { Module } from '@nestjs/common';
import { AccountModule } from './modules/account/account.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { DonationModule } from './modules/donation/donation.module';
import { MercadopagoService } from './services/mercadopago/mercadopago.service';

@Module({
  imports: [AccountModule, AuthenticationModule, DonationModule],
  providers: [MercadopagoService],
})
export class AppModule {}
