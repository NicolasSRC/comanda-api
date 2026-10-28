import { Controller, Query, Sse, type MessageEvent } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { filter, interval, map, merge, type Observable } from 'rxjs';
import { Public } from '../../common/decorators/public.decorator';
import { EventsService } from './events.service';

const HEARTBEAT_MS = 25_000;

@ApiTags('Eventos')
@Controller('eventos')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /**
   * RF-48: notifica apertura de pedidos, ítems nuevos y cambios de estado.
   * La autenticación va por `?token=` porque EventSource no admite cabeceras.
   */
  @Public()
  @Sse('pedidos')
  @ApiQuery({ name: 'token', required: true, description: 'Access token JWT' })
  @ApiOperation({ summary: 'Flujo SSE de pedidos e ítems del restaurante' })
  async stream(@Query('token') token?: string): Promise<Observable<MessageEvent>> {
    const actor = await this.events.authenticate(token);
    const restaurantId = actor.restaurantId;

    const events = this.events.orders$.pipe(
      filter((event) => event.restaurantId === restaurantId),
      map((event) => ({ type: event.type, data: event }) satisfies MessageEvent),
    );

    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map(() => ({ type: 'ping', data: { at: new Date().toISOString() } }) satisfies MessageEvent),
    );

    return merge(events, heartbeat);
  }
}
