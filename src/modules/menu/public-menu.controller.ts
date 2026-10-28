import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MenuService } from './menu.service';

@ApiTags('Carta pública')
@Controller('publico')
export class PublicMenuController {
  constructor(private readonly menu: MenuService) {}

  @Public()
  @Get(':restauranteSlug/carta')
  @ApiOperation({ summary: 'Carta publicada de solo lectura para QR o web' })
  getPublicMenu(@Param('restauranteSlug') restauranteSlug: string) {
    return this.menu.getPublicMenu(restauranteSlug);
  }
}
