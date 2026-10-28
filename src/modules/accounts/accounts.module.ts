import { Module } from '@nestjs/common';
import { AccountCalculatorService } from './account-calculator.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountCalculatorService, AccountsService],
  exports: [AccountCalculatorService, AccountsService],
})
export class AccountsModule {}
