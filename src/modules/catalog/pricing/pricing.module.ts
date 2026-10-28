import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { MenuPricingService } from './menu-pricing.service';
import { PriceRulesController } from './price-rules.controller';
import { PriceRulesService } from './price-rules.service';

@Module({
  imports: [AuditModule],
  controllers: [PriceRulesController],
  providers: [MenuPricingService, PriceRulesService],
  exports: [MenuPricingService, PriceRulesService],
})
export class PricingModule {}
