import { Module } from '@nestjs/common';
import { MenuPricingService } from './menu-pricing.service';
import { PriceRulesController } from './price-rules.controller';
import { PriceRulesService } from './price-rules.service';

@Module({
  controllers: [PriceRulesController],
  providers: [MenuPricingService, PriceRulesService],
  exports: [MenuPricingService, PriceRulesService],
})
export class PricingModule {}
