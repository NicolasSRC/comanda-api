-- Reglas de negocio a nivel de datos (RF-50 a RF-57)
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_account_config_valid" CHECK (
  "tip_suggested_bps" BETWEEN 0 AND 10000 AND
  "discount_approval_threshold_bps" BETWEEN 0 AND 10000
);

ALTER TABLE "taxes" ADD CONSTRAINT "taxes_rate_bps_valid" CHECK ("rate_bps" BETWEEN 0 AND 10000);

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_amounts_non_negative" CHECK (
  "subtotal" >= 0 AND "discount_total" >= 0 AND "tax_total" >= 0 AND
  "tip_total" >= 0 AND "total" >= 0 AND "paid_total" >= 0
);
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tip_bps_valid" CHECK ("tip_bps" BETWEEN 0 AND 10000);

ALTER TABLE "discounts" ADD CONSTRAINT "discounts_value_valid" CHECK (
  "value" >= 0 AND ("type" <> 'PERCENT' OR "value" <= 10000)
);
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_scope_item_valid" CHECK (
  ("scope" = 'ITEM' AND "order_item_id" IS NOT NULL) OR
  ("scope" = 'ACCOUNT' AND "order_item_id" IS NULL)
);

ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "splits" ADD CONSTRAINT "splits_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "split_items" ADD CONSTRAINT "split_items_values_valid" CHECK ("quantity" > 0 AND "amount" >= 0);

-- Una sola cuenta abierta por mesa (RF-56 / regla 7).
CREATE UNIQUE INDEX "accounts_one_open_per_table" ON "accounts"("table_id") WHERE "status" = 'OPEN';
