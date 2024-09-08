import { Module } from '@nestjs/common';
import { AccountModule } from './modules/account/account.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';

@Module({
  imports: [AccountModule, AuthenticationModule],
})
export class AppModule {}
