-- AlterTable: add dispatch_reference to sales_orders for tracking external dispatch/shipment references
ALTER TABLE "sales_orders" ADD COLUMN "dispatch_reference" TEXT;
