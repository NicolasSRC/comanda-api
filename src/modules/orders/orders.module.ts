import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { AuditModule } from '../audit/audit.module';
import { PricingModule } from '../catalog/pricing/pricing.module';
import { AreasController } from './areas.controller';
import { OrderItemCalculatorService } from './order-item-calculator.service';
import { OrderStatusService } from './order-status.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { ZonesController } from './zones.controller';
import { ZonesService } from './zones.service';

@Module({
  imports: [PricingModule, AccountsModule, AuditModule],
  controllers: [ZonesController, TablesController, OrdersController, AreasController],
  providers: [
    ZonesService,
    TablesService,
    OrdersService,
    OrderStatusService,
    OrderItemCalculatorService,
  ],
  exports: [OrdersService, TablesService, ZonesService],
})
export class OrdersModule {}
