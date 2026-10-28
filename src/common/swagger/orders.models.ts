import { ApiProperty } from '@nestjs/swagger';
import { OrderItemStatus, OrderStatus, PreparationArea, TableStatus } from '@prisma/client';
import { UserRefModel } from './common.models';

export class ZoneRefModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Salón principal' })
  name!: string;
}

export class OrderTableModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Mesa 4' })
  name!: string;

  @ApiProperty({ example: 4 })
  capacity!: number;

  @ApiProperty({ enum: TableStatus, enumName: 'TableStatus' })
  status!: TableStatus;

  @ApiProperty({ type: () => ZoneRefModel })
  zone!: ZoneRefModel;
}

export class OrderWaiterModel extends UserRefModel {
  @ApiProperty({ example: 'mesero@demo.com' })
  email!: string;
}

export class OrderTableCountModel {
  @ApiProperty({ example: 5 })
  items!: number;
}

export class OrderItemModifierModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  orderItemId!: string;

  @ApiProperty({ format: 'uuid' })
  modifierId!: string;

  @ApiProperty({ example: 'Queso extra' })
  nameSnapshot!: string;

  @ApiProperty({ example: 2000 })
  extraPrice!: number;

  @ApiProperty({ example: 1 })
  quantity!: number;
}

/** Ítem de pedido tal como se guarda en la base de datos, con el precio congelado. */
export class OrderDetailItemModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  variantId!: string | null;

  @ApiProperty({ example: 'Ceviche clásico' })
  productNameSnapshot!: string;

  @ApiProperty({ example: 'Grande', nullable: true, type: String })
  variantNameSnapshot!: string | null;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 28000 })
  unitPrice!: number;

  @ApiProperty({ example: 4000 })
  modifiersTotal!: number;

  @ApiProperty({ example: 60000 })
  lineTotal!: number;

  @ApiProperty({ example: 'Sin cebolla', nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ enum: PreparationArea, enumName: 'PreparationArea' })
  preparationArea!: PreparationArea;

  @ApiProperty({ enum: OrderItemStatus, enumName: 'OrderItemStatus' })
  status!: OrderItemStatus;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  sentAt!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  startedAt!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  readyAt!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  servedAt!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  cancelledAt!: Date | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  cancelledById!: string | null;

  @ApiProperty({ example: 'El cliente cambió de opinión', nullable: true, type: String })
  cancelReason!: string | null;

  @ApiProperty({ example: 480, nullable: true, type: Number })
  preparationSeconds!: number | null;

  @ApiProperty({ type: () => [OrderItemModifierModel] })
  modifiers!: OrderItemModifierModel[];
}

export class OrderItemOrderRefModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  tableId!: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;
}

export class OrderItemProductRefModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ceviche clásico' })
  name!: string;
}

/** Ítem devuelto por las operaciones individuales (crear, cambiar estado, cancelar). */
export class OrderItemModel extends OrderDetailItemModel {
  @ApiProperty({ type: () => OrderItemOrderRefModel })
  order!: OrderItemOrderRefModel;

  @ApiProperty({ type: () => OrderItemProductRefModel })
  product!: OrderItemProductRefModel;

  @ApiProperty({ type: () => OrderItemProductRefModel, nullable: true })
  variant!: OrderItemProductRefModel | null;

  @ApiProperty({ type: () => UserRefModel, nullable: true })
  cancelledBy!: UserRefModel | null;
}

/** Pedido completo con mesa, mesero e ítems. */
export class OrderModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  tableId!: string;

  @ApiProperty({ format: 'uuid' })
  waiterId!: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiProperty({ example: 4 })
  guests!: number;

  @ApiProperty({ example: 'Cumpleaños', nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  openedAt!: Date;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  closedAt!: Date | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => OrderTableModel })
  table!: OrderTableModel;

  @ApiProperty({ type: () => OrderWaiterModel })
  waiter!: OrderWaiterModel;

  @ApiProperty({ type: () => [OrderDetailItemModel] })
  items!: OrderDetailItemModel[];

  @ApiProperty({ example: 124000, description: 'Suma de ítems no cancelados.' })
  total!: number;
}

/** Fila del listado de pedidos. */
export class OrderListItemModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  tableId!: string;

  @ApiProperty({ format: 'uuid' })
  waiterId!: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiProperty({ example: 4 })
  guests!: number;

  @ApiProperty({ example: 'Cumpleaños', nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  openedAt!: Date;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  closedAt!: Date | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => OrderTableModel })
  table!: OrderTableModel;

  @ApiProperty({ type: () => UserRefModel })
  waiter!: UserRefModel;

  @ApiProperty({ type: () => OrderTableCountModel })
  _count!: OrderTableCountModel;
}

export class QueueOrderRefModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 4 })
  guests!: number;

  @ApiProperty({ format: 'date-time', type: String })
  openedAt!: Date;

  @ApiProperty({ type: () => OrderTableModel })
  table!: OrderTableModel;

  @ApiProperty({ type: () => UserRefModel })
  waiter!: UserRefModel;
}

/** Ítem de la cola de preparación de un área. */
export class QueueItemModel extends OrderDetailItemModel {
  @ApiProperty({ type: () => QueueOrderRefModel })
  order!: QueueOrderRefModel;
}

export class TableOpenOrderModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiProperty({ example: 4 })
  guests!: number;

  @ApiProperty({ format: 'date-time', type: String })
  openedAt!: Date;

  @ApiProperty({ format: 'uuid' })
  waiterId!: string;
}

export class TableZoneModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Salón principal' })
  name!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class TableModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ format: 'uuid' })
  zoneId!: string;

  @ApiProperty({ example: 'Mesa 4' })
  name!: string;

  @ApiProperty({ example: 4 })
  capacity!: number;

  @ApiProperty({ enum: TableStatus, enumName: 'TableStatus' })
  status!: TableStatus;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => TableZoneModel })
  zone!: TableZoneModel;

  @ApiProperty({
    type: () => [TableOpenOrderModel],
    description: 'Pedido abierto de la mesa, si existe.',
  })
  orders!: TableOpenOrderModel[];
}

export class ZoneTableCountModel {
  @ApiProperty({ example: 8 })
  tables!: number;
}

export class ZoneModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  restaurantId!: string;

  @ApiProperty({ example: 'Salón principal' })
  name!: string;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: Date;

  @ApiProperty({ type: () => ZoneTableCountModel })
  _count!: ZoneTableCountModel;
}
