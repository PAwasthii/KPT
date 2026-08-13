import { PrismaClient, StockStatus } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

function status(qty: number, min: number): StockStatus {
  if (qty === 0) return StockStatus.OUT_OF_STOCK;
  if (qty <= 5) return StockStatus.CRITICAL;
  if (qty < min) return StockStatus.LOW;
  return StockStatus.HEALTHY;
}

const items = [
  { sku: 'KPT-AG4-001', productName: 'KPT 100mm Angle Grinder', category: 'Grinders', description: '100mm angle grinder, 670W', totalQty: 120, minStockQty: 30, reorderQty: 50, unitPrice: 2850 },
  { sku: 'KPT-AG5-001', productName: 'KPT 115mm Angle Grinder', category: 'Grinders', description: '115mm angle grinder, 820W', totalQty: 85, minStockQty: 30, reorderQty: 50, unitPrice: 3200 },
  { sku: 'KPT-AG7-001', productName: 'KPT 180mm Angle Grinder', category: 'Grinders', description: '180mm angle grinder, 2000W', totalQty: 18, minStockQty: 20, reorderQty: 40, unitPrice: 5400 },
  { sku: 'KPT-AG9-001', productName: 'KPT 230mm Angle Grinder', category: 'Grinders', description: '230mm angle grinder, 2400W', totalQty: 0, minStockQty: 15, reorderQty: 30, unitPrice: 7800 },
  { sku: 'KPT-ID13-001', productName: 'KPT 13mm Impact Drill', category: 'Drills', description: '13mm impact drill, 650W', totalQty: 95, minStockQty: 25, reorderQty: 40, unitPrice: 3600 },
  { sku: 'KPT-SDS-001', productName: 'KPT SDS Plus Rotary Hammer', category: 'Drills', description: 'SDS Plus rotary hammer, 800W', totalQty: 3, minStockQty: 15, reorderQty: 25, unitPrice: 8500 },
  { sku: 'KPT-CD18-001', productName: 'KPT Cordless Drill 18V', category: 'Drills', description: '18V cordless drill with battery', totalQty: 42, minStockQty: 20, reorderQty: 30, unitPrice: 6200 },
  { sku: 'KPT-DH-001', productName: 'KPT Demolition Hammer', category: 'Hammers', description: 'Heavy-duty demolition hammer, 1500W', totalQty: 0, minStockQty: 10, reorderQty: 20, unitPrice: 12500 },
  { sku: 'KPT-RH-001', productName: 'KPT Rotary Hammer 26mm', category: 'Hammers', description: '26mm SDS Plus rotary hammer, 800W', totalQty: 22, minStockQty: 10, reorderQty: 20, unitPrice: 9200 },
  { sku: 'KPT-IW-001', productName: 'KPT Impact Wrench', category: 'Others', description: '1/2 inch impact wrench, 700W', totalQty: 28, minStockQty: 15, reorderQty: 25, unitPrice: 7200 },
  { sku: 'KPT-CS7-001', productName: 'KPT 7-1/4 Circular Saw', category: 'Saws', description: '7-1/4 inch circular saw, 1200W', totalQty: 33, minStockQty: 15, reorderQty: 25, unitPrice: 4800 },
  { sku: 'KPT-JS-001', productName: 'KPT Jigsaw', category: 'Saws', description: 'Variable speed jigsaw, 650W', totalQty: 7, minStockQty: 10, reorderQty: 20, unitPrice: 3900 },
  { sku: 'KPT-BS-001', productName: 'KPT Belt Sander', category: 'Sanders', description: 'Belt sander, 900W, 75x457mm', totalQty: 4, minStockQty: 10, reorderQty: 15, unitPrice: 5100 },
  { sku: 'KPT-OS-001', productName: 'KPT Orbital Sander', category: 'Sanders', description: 'Orbital sander, 300W, 125mm', totalQty: 19, minStockQty: 10, reorderQty: 20, unitPrice: 2400 },
  { sku: 'KPT-HG-001', productName: 'KPT Heat Gun', category: 'Others', description: 'Variable temperature heat gun, 2000W', totalQty: 7, minStockQty: 10, reorderQty: 20, unitPrice: 2200 },
  { sku: 'KPT-PL-001', productName: 'KPT Polisher', category: 'Others', description: 'Variable speed polisher, 1200W', totalQty: 11, minStockQty: 8, reorderQty: 15, unitPrice: 6800 },
];

async function main() {
  console.log('Seeding inventory items…');
  let created = 0, updated = 0;

  for (const item of items) {
    const stockStatus = status(item.totalQty, item.minStockQty);
    const existing = await prisma.inventoryItem.findUnique({ where: { sku: item.sku } });
    if (existing) {
      await prisma.inventoryItem.update({
        where: { sku: item.sku },
        data: { ...item, stockStatus, lastUpdated: new Date() },
      });
      updated++;
    } else {
      await prisma.inventoryItem.create({
        data: { ...item, stockStatus, lastUpdated: new Date() },
      });
      created++;
    }
  }

  console.log(`Done — created: ${created}, updated: ${updated}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
