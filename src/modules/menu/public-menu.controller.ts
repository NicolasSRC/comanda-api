import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PublicMenuModel } from '../../common/swagger/menu.models';
import { MenuService } from './menu.service';

@ApiTags('Carta pública')
@Controller('publico')
export class PublicMenuController {
  constructor(private readonly menu: MenuService) {}

  @Public()
  @Get(':restauranteSlug/carta')
  @ApiOperation({ summary: 'Carta publicada de solo lectura para QR o web' })
  @ApiOkResponse({ type: PublicMenuModel })
  getPublicMenu(@Param('restauranteSlug') restauranteSlug: string) {
    return this.menu.getPublicMenu(restauranteSlug);
  }
}
