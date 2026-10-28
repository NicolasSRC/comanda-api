import { Module } from '@nestjs/common';
import { PricingModule } from '../catalog/pricing/pricing.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuSnapshotService } from './menu-snapshot.service';
import { PublicMenuController } from './public-menu.controller';

@Module({
  imports: [PricingModule],
  controllers: [MenuController, PublicMenuController],
  providers: [MenuService, MenuSnapshotService],
  exports: [MenuService, MenuSnapshotService],
})
export class MenuModule {}
