-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('FREE', 'OCCUPIED', 'TO_CHARGE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'IN_PREPARATION', 'READY', 'SERVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TableStatus" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "waiter_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "guests" INTEGER NOT NULL,
    "notes" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "product_name_snapshot" TEXT NOT NULL,
    "variant_name_snapshot" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "modifiers_total" INTEGER NOT NULL DEFAULT 0,
    "line_total" INTEGER NOT NULL,
    "notes" TEXT,
    "preparation_area" "PreparationArea" NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "served_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_id" UUID,
    "cancel_reason" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_modifiers" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "modifier_id" UUID NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "extra_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zones_restaurant_id_is_active_sort_order_idx" ON "zones"("restaurant_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "zones_restaurant_id_name_key" ON "zones"("restaurant_id", "name");

-- CreateIndex
CREATE INDEX "tables_restaurant_id_zone_id_status_idx" ON "tables"("restaurant_id", "zone_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tables_restaurant_id_name_key" ON "tables"("restaurant_id", "name");

-- CreateIndex
CREATE INDEX "orders_restaurant_id_status_opened_at_idx" ON "orders"("restaurant_id", "status", "opened_at");

-- CreateIndex
CREATE INDEX "orders_table_id_idx" ON "orders"("table_id");

-- CreateIndex
CREATE INDEX "order_items_restaurant_id_preparation_area_status_created_a_idx" ON "order_items"("restaurant_id", "preparation_area", "status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_restaurant_id_order_id_idx" ON "order_items"("restaurant_id", "order_id");

-- CreateIndex
CREATE INDEX "order_item_modifiers_restaurant_id_order_item_id_idx" ON "order_item_modifiers"("restaurant_id", "order_item_id");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "modifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reglas de integridad del dominio (RF-30 a RF-49)
ALTER TABLE "tables" ADD CONSTRAINT "tables_capacity_positive" CHECK ("capacity" > 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_guests_positive" CHECK ("guests" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_amounts_valid" CHECK (
  "unit_price" >= 0 AND "modifiers_total" >= 0 AND "line_total" >= 0
);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_line_total_consistent" CHECK (
  "line_total" = "unit_price" * "quantity" + "modifiers_total"
);
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_values_valid" CHECK (
  "extra_price" >= 0 AND "quantity" > 0
);

-- Solo puede existir un pedido abierto por mesa (RF-30/RF-31).
CREATE UNIQUE INDEX "orders_one_open_per_table"
  ON "orders" ("table_id")
  WHERE "status" = 'OPEN';
