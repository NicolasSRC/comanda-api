-- CreateEnum
CREATE TYPE "PreparationArea" AS ENUM ('KITCHEN', 'BAR');

-- CreateEnum
CREATE TYPE "MenuVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_price" INTEGER NOT NULL,
    "image_url" TEXT,
    "preparation_area" "PreparationArea" NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_groups" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_selections" INTEGER NOT NULL DEFAULT 0,
    "max_selections" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifiers" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "extra_price" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_modifier_groups" (
    "product_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_modifier_groups_pkey" PRIMARY KEY ("product_id","group_id")
);

-- CreateTable
CREATE TABLE "price_rules" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "days_of_week" SMALLINT NOT NULL DEFAULT 127,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_windows" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "days_of_week" SMALLINT NOT NULL DEFAULT 127,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_items" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "combo_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_versions" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MenuVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "snapshot" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_restaurant_id_is_active_sort_order_idx" ON "categories"("restaurant_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "categories_restaurant_id_name_key" ON "categories"("restaurant_id", "name");

-- CreateIndex
CREATE INDEX "products_restaurant_id_category_id_is_active_idx" ON "products"("restaurant_id", "category_id", "is_active");

-- CreateIndex
CREATE INDEX "products_restaurant_id_preparation_area_idx" ON "products"("restaurant_id", "preparation_area");

-- CreateIndex
CREATE UNIQUE INDEX "products_restaurant_id_name_key" ON "products"("restaurant_id", "name");

-- CreateIndex
CREATE INDEX "variants_restaurant_id_product_id_idx" ON "variants"("restaurant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "variants_product_id_name_key" ON "variants"("product_id", "name");

-- CreateIndex
CREATE INDEX "modifier_groups_restaurant_id_is_active_idx" ON "modifier_groups"("restaurant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "modifier_groups_restaurant_id_name_key" ON "modifier_groups"("restaurant_id", "name");

-- CreateIndex
CREATE INDEX "modifiers_restaurant_id_group_id_idx" ON "modifiers"("restaurant_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "modifiers_group_id_name_key" ON "modifiers"("group_id", "name");

-- CreateIndex
CREATE INDEX "price_rules_restaurant_id_product_id_is_active_idx" ON "price_rules"("restaurant_id", "product_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "price_rules_product_id_name_key" ON "price_rules"("product_id", "name");

-- CreateIndex
CREATE INDEX "availability_windows_restaurant_id_product_id_is_active_idx" ON "availability_windows"("restaurant_id", "product_id", "is_active");

-- CreateIndex
CREATE INDEX "combos_restaurant_id_is_active_idx" ON "combos"("restaurant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "combos_restaurant_id_name_key" ON "combos"("restaurant_id", "name");

-- CreateIndex
CREATE INDEX "combo_items_combo_id_idx" ON "combo_items"("combo_id");

-- CreateIndex
CREATE INDEX "menu_versions_restaurant_id_status_published_at_idx" ON "menu_versions"("restaurant_id", "status", "published_at");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combos" ADD CONSTRAINT "combos_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_versions" ADD CONSTRAINT "menu_versions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_versions" ADD CONSTRAINT "menu_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reglas de integridad del dominio (RF-10 a RF-20)
ALTER TABLE "products" ADD CONSTRAINT "products_base_price_non_negative" CHECK ("base_price" >= 0);
ALTER TABLE "variants" ADD CONSTRAINT "variants_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_selection_range" CHECK ("min_selections" >= 0 AND "max_selections" >= "min_selections");
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_extra_price_non_negative" CHECK ("extra_price" >= 0);
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_values_valid" CHECK ("price" >= 0 AND "priority" >= 0 AND "days_of_week" BETWEEN 1 AND 127);
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_time_format" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_values_valid" CHECK ("days_of_week" BETWEEN 1 AND 127);
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_time_format" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "combos" ADD CONSTRAINT "combos_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_quantity_positive" CHECK ("quantity" > 0);

-- Solo puede existir una versión publicada por restaurante (RF-19/RF-20).
CREATE UNIQUE INDEX "menu_versions_one_published_per_restaurant"
  ON "menu_versions" ("restaurant_id")
  WHERE "status" = 'PUBLISHED';
