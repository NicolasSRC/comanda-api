import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseModel {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status!: 'ok' | 'error';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  database!: 'up' | 'down';

  @ApiProperty({ example: '2026-10-28T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 1234, description: 'Segundos que lleva la API en ejecución.' })
  uptime!: number;

  @ApiProperty({ example: '0.1.0' })
  version!: string;
}
