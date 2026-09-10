-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('RESERVED', 'DISPATCHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN "payment_status" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateTable
CREATE TABLE "stock_order_allocations" (
    "id" SERIAL NOT NULL,
    "sales_order_id" INTEGER NOT NULL,
    "line_item_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "allocated_qty" INTEGER NOT NULL,
    "dispatched_qty" INTEGER NOT NULL DEFAULT 0,
    "status" "AllocationStatus" NOT NULL DEFAULT 'RESERVED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_order_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_order_allocations_sales_order_id_idx" ON "stock_order_allocations"("sales_order_id");

-- CreateIndex
CREATE INDEX "stock_order_allocations_line_item_id_idx" ON "stock_order_allocations"("line_item_id");

-- CreateIndex
CREATE INDEX "stock_order_allocations_inventory_item_id_idx" ON "stock_order_allocations"("inventory_item_id");

-- CreateIndex
CREATE INDEX "stock_order_allocations_status_idx" ON "stock_order_allocations"("status");

-- AddForeignKey
ALTER TABLE "stock_order_allocations" ADD CONSTRAINT "stock_order_allocations_sales_order_id_fkey"
    FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_order_allocations" ADD CONSTRAINT "stock_order_allocations_line_item_id_fkey"
    FOREIGN KEY ("line_item_id") REFERENCES "sales_order_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_order_allocations" ADD CONSTRAINT "stock_order_allocations_inventory_item_id_fkey"
    FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
