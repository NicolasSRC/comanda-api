-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(60) NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_restaurant_id_created_at_idx" ON "audit_logs"("restaurant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_restaurant_id_entity_type_entity_id_idx" ON "audit_logs"("restaurant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_restaurant_id_action_created_at_idx" ON "audit_logs"("restaurant_id", "action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "accounts_restaurant_id_status_closed_at_idx" ON "accounts"("restaurant_id", "status", "closed_at");

-- CreateIndex
CREATE INDEX "order_items_restaurant_id_preparation_area_ready_at_idx" ON "order_items"("restaurant_id", "preparation_area", "ready_at");

-- CreateIndex
CREATE INDEX "payments_restaurant_id_created_at_idx" ON "payments"("restaurant_id", "created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
