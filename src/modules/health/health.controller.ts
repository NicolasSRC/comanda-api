import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { HealthResponseModel } from '../../common/swagger/health.models';
import { HealthService } from './health.service';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Estado de la API y de la base de datos' })
  @ApiOkResponse({ type: HealthResponseModel })
  async check() {
    const databaseUp = await this.healthService.isDatabaseUp();

    const payload = {
      status: databaseUp ? 'ok' : 'error',
      database: databaseUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '0.1.0',
    };

    if (!databaseUp) {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }
}
