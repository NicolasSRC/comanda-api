-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('OPEN', 'CLOSED', 'VOIDED');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('ITEM', 'ACCOUNT');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TipBase" AS ENUM ('SUBTOTAL', 'TOTAL');

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "discount_approval_threshold_bps" INTEGER NOT NULL DEFAULT 2000,
ADD COLUMN     "prices_include_tax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tip_base" "TipBase" NOT NULL DEFAULT 'TOTAL',
ADD COLUMN     "tip_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tip_suggested_bps" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "taxes" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate_bps" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'OPEN',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "discount_total" INTEGER NOT NULL DEFAULT 0,
    "tax_total" INTEGER NOT NULL DEFAULT 0,
    "tip_total" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "paid_total" INTEGER NOT NULL DEFAULT 0,
    "tip_bps" INTEGER NOT NULL DEFAULT 0,
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "closed_at" TIMESTAMP(3),
    "voided_by_id" UUID,
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "order_item_id" UUID,
    "scope" "DiscountScope" NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "applied_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "split_id" UUID,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "received_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "splits" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_items" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "split_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "split_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taxes_restaurant_id_is_active_sort_order_idx" ON "taxes"("restaurant_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "taxes_restaurant_id_name_key" ON "taxes"("restaurant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_order_id_key" ON "accounts"("order_id");

-- CreateIndex
CREATE INDEX "accounts_restaurant_id_status_created_at_idx" ON "accounts"("restaurant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "accounts_table_id_idx" ON "accounts"("table_id");

-- CreateIndex
CREATE INDEX "discounts_restaurant_id_account_id_idx" ON "discounts"("restaurant_id", "account_id");

-- CreateIndex
CREATE INDEX "discounts_order_item_id_idx" ON "discounts"("order_item_id");

-- CreateIndex
CREATE INDEX "payments_restaurant_id_account_id_created_at_idx" ON "payments"("restaurant_id", "account_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_split_id_idx" ON "payments"("split_id");

-- CreateIndex
CREATE INDEX "splits_restaurant_id_account_id_idx" ON "splits"("restaurant_id", "account_id");

-- CreateIndex
CREATE INDEX "split_items_restaurant_id_split_id_idx" ON "split_items"("restaurant_id", "split_id");

-- CreateIndex
CREATE UNIQUE INDEX "split_items_split_id_order_item_id_key" ON "split_items"("split_id", "order_item_id");

-- AddForeignKey
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_applied_by_id_fkey" FOREIGN KEY ("applied_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "splits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "splits" ADD CONSTRAINT "splits_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "splits" ADD CONSTRAINT "splits_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_items" ADD CONSTRAINT "split_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_items" ADD CONSTRAINT "split_items_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_items" ADD CONSTRAINT "split_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
