import { Module } from '@nestjs/common';
import { ReportsCalculatorService } from './reports-calculator.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsCalculatorService, ReportsService],
  exports: [ReportsCalculatorService, ReportsService],
})
export class ReportsModule {}
