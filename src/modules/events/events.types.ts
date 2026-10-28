export type OrderEventType =
  | 'order.opened'
  | 'order.updated'
  | 'items.created'
  | 'item.updated';

/** Evento mínimo que consume el frontend por SSE (RF-48). */
export interface OrderEvent {
  type: OrderEventType;
  restaurantId: string;
  orderId: string;
  tableId: string | null;
  itemId: string | null;
  status: string | null;
  at: string;
}
