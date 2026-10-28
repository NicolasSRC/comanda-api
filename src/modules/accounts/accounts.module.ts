import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';
import { AccountCalculatorService } from './account-calculator.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [AuditModule, EventsModule],
  controllers: [AccountsController],
  providers: [AccountCalculatorService, AccountsService],
  exports: [AccountCalculatorService, AccountsService],
})
export class AccountsModule {}
