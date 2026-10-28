import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CombosController } from './combos.controller';
import { CombosService } from './combos.service';
import { PricingModule } from './pricing/pricing.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PricingModule],
  controllers: [CategoriesController, ProductsController, CombosController],
  providers: [CategoriesService, ProductsService, CombosService],
  exports: [CategoriesService, ProductsService, CombosService],
})
export class CatalogModule {}
