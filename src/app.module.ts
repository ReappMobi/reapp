import { Module } from '@nestjs/common';
import { AccountModule } from './modules/account/account.module';

@Module({
  imports: [AccountModule],
})
export class AppModule {}
