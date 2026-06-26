import { PrismaClient } from '@prisma/client';
import { cliLog, cliError } from './cli-log';

const prisma = new PrismaClient();

async function main() {
  cliLog('Faz 3 ve Eksik Modül Verileri Yükleniyor...');
  const tenantId = 'ten-b1';

  // 1. Fetch some existing products to use
  const products = await prisma.product.findMany({ where: { tenantId }, take: 10 });
  const customers = await prisma.contact.findMany({ where: { tenantId, type: { in: ['CUSTOMER', 'BOTH'] } }, take: 5 });

  if (products.length < 5) {
    cliLog('Yeterli ürün bulunamadı, önce ana seed.ts çalıştırılmalı.');
    return;
  }

  // BOMs
  cliLog('Reçeteler oluşturuluyor...');
  const bom1 = await prisma.billOfMaterial.create({
    data: {
      tenantId, code: 'BOM-1001', name: 'Standart Üretim Paketi', productId: products[0].id, quantity: 1,
      items: { create: [{ productId: products[1].id, quantity: 2 }, { productId: products[2].id, quantity: 0.5 }] }
    }
  });
  const bom2 = await prisma.billOfMaterial.create({
    data: {
      tenantId, code: 'BOM-1002', name: 'Premium Üretim Paketi', productId: products[3].id, quantity: 1,
      items: { create: [{ productId: products[4].id, quantity: 5 }] }
    }
  });

  // Work Orders
  cliLog('İş emirleri oluşturuluyor...');
  await prisma.workOrder.create({
    data: {
      tenantId, code: 'WO-2001', bomId: bom1.id, status: 'IN_PROGRESS', quantity: 100, plannedDate: new Date(), notes: 'Acil sipariş',
      items: { create: [{ productId: products[1].id, quantity: 200 }, { productId: products[2].id, quantity: 50 }] }
    }
  });
  await prisma.workOrder.create({
    data: {
      tenantId, code: 'WO-2002', bomId: bom2.id, status: 'COMPLETED', quantity: 50, plannedDate: new Date(),
      items: { create: [{ productId: products[4].id, quantity: 250 }] }
    }
  });

  // Price Lists
  cliLog('Fiyat listeleri oluşturuluyor...');
  const pl1 = await prisma.priceList.create({
    data: {
      tenantId, name: 'B2B Toptan Liste 2026', currency: 'TRY', isDefault: true,
      items: { create: [{ productId: products[0].id, price: 1500 }, { productId: products[1].id, price: 200 }] }
    }
  });
  const pl2 = await prisma.priceList.create({
    data: {
      tenantId, name: 'B2B İhracat Liste', currency: 'USD', isDefault: false,
      items: { create: [{ productId: products[2].id, price: 50 }] }
    }
  });

  if (customers.length > 0) {
    await prisma.contact.update({ where: { id: customers[0].id }, data: { priceListId: pl1.id } });
  }

  // B2B Orders
  cliLog('B2B Siparişler oluşturuluyor...');
  if (customers.length > 0) {
    await prisma.b2BOrder.create({
      data: {
        tenantId, code: 'B2B-ORD-001', contactId: customers[0].id, status: 'PENDING', total: 15000, subtotal: 15000,
        lines: { create: [{ productId: products[0].id, quantity: 10, unitPrice: 1500, total: 15000 }] }
      }
    });
    await prisma.b2BOrder.create({
      data: {
        tenantId, code: 'B2B-ORD-002', contactId: customers[1]?.id || customers[0].id, status: 'APPROVED', total: 400, subtotal: 400,
        lines: { create: [{ productId: products[1].id, quantity: 2, unitPrice: 200, total: 400 }] }
      }
    });
  }

  cliLog('Faz 3 verileri başarıyla yüklendi!');
}

main()
  .catch((e) => {
    cliError(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
