import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AccountCalculatorService } from './account-calculator.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [AuditModule],
  controllers: [AccountsController],
  providers: [AccountCalculatorService, AccountsService],
  exports: [AccountCalculatorService, AccountsService],
})
export class AccountsModule {}
