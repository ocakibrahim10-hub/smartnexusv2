import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysLater(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log('Ek modüller (HR, MRP, B2C) için örnek veriler ekleniyor...');

  const tenantId = 'ten-b1';
  
  // 1. Get users for HR
  const users = await prisma.user.findMany({ where: { tenantId } });
  if (users.length > 0) {
    const user1 = users.find(u => u.role === 'STAFF') || users[0];
    const user2 = users.find(u => u.role === 'WAREHOUSE') || users[0];

    // Delete existing to prevent duplication
    await prisma.employeeLeave.deleteMany({ where: { tenantId } });
    await prisma.payroll.deleteMany({ where: { tenantId } });

    console.log('İzinler ekleniyor...');
    await prisma.employeeLeave.createMany({
      data: [
        {
          tenantId,
          userId: user1.id,
          type: 'ANNUAL',
          startDate: daysAgo(10),
          endDate: daysAgo(5),
          status: 'APPROVED',
          reason: 'Yıllık izin',
        },
        {
          tenantId,
          userId: user2.id,
          type: 'SICK',
          startDate: daysAgo(2),
          endDate: daysAgo(1),
          status: 'APPROVED',
          reason: 'Hastalık',
        },
        {
          tenantId,
          userId: user1.id,
          type: 'UNPAID',
          startDate: daysLater(5),
          endDate: daysLater(7),
          status: 'PENDING',
          reason: 'Özel sebepler',
        }
      ]
    });

    console.log('Bordrolar ekleniyor...');
    await prisma.payroll.createMany({
      data: [
        {
          tenantId,
          userId: user1.id,
          period: 'Mayıs 2026',
          baseSalary: 25000,
          bonus: 2000,
          deduction: 500,
          netPay: 26500,
          isPaid: true,
          paidAt: daysAgo(20),
        },
        {
          tenantId,
          userId: user2.id,
          period: 'Mayıs 2026',
          baseSalary: 30000,
          bonus: 0,
          deduction: 0,
          netPay: 30000,
          isPaid: true,
          paidAt: daysAgo(20),
        },
        {
          tenantId,
          userId: user1.id,
          period: 'Haziran 2026',
          baseSalary: 25000,
          bonus: 1000,
          deduction: 0,
          netPay: 26000,
          isPaid: false,
        }
      ]
    });
  }

  // 2. MRP (BillOfMaterial & WorkOrder)
  const products = await prisma.product.findMany({ where: { tenantId }, take: 5 });
  if (products.length >= 3) {
    await prisma.workOrder.deleteMany({ where: { tenantId } });
    await prisma.billOfMaterial.deleteMany({ where: { tenantId } });

    console.log('Reçeteler ve İş Emirleri ekleniyor...');
    const bom = await prisma.billOfMaterial.create({
      data: {
        tenantId,
        code: 'BOM-001',
        name: 'Bilgisayar Montajı',
        productId: products[0].id,
        quantity: 1,
        items: {
          create: [
            { productId: products[1].id, quantity: 1, unit: 'ADET' },
            { productId: products[2].id, quantity: 2, unit: 'ADET' },
          ]
        }
      }
    });

    await prisma.workOrder.createMany({
      data: [
        {
          tenantId,
          code: 'WO-2026-001',
          bomId: bom.id,
          status: 'COMPLETED',
          quantity: 10,
          plannedDate: daysAgo(5),
          startDate: daysAgo(4),
          endDate: daysAgo(2),
          notes: 'Geçen haftaki siparişler için üretim.',
        },
        {
          tenantId,
          code: 'WO-2026-002',
          bomId: bom.id,
          status: 'IN_PROGRESS',
          quantity: 25,
          plannedDate: daysAgo(1),
          startDate: daysAgo(0),
          notes: 'Acil stok tamamlaması.',
        },
        {
          tenantId,
          code: 'WO-2026-003',
          bomId: bom.id,
          status: 'PLANNED',
          quantity: 50,
          plannedDate: daysLater(3),
          notes: 'Gelecek ay planlaması.',
        }
      ]
    });
  }

  // 3. B2C / Integrations
  console.log('Entegrasyon ayarları ekleniyor...');
  await prisma.tenantIntegration.upsert({
    where: { tenantId_type_provider: { tenantId, type: 'B2C_ECOMMERCE', provider: 'TRENDYOL' } },
    update: {
      config: { sellerId: '123456', integrationRef: 'TRND-REF', apiKey: 'abc...', apiSecret: 'xyz...' },
      isActive: true,
      lastSyncAt: new Date()
    },
    create: {
      tenantId,
      type: 'B2C_ECOMMERCE',
      provider: 'TRENDYOL',
      config: { sellerId: '123456', integrationRef: 'TRND-REF', apiKey: 'abc...', apiSecret: 'xyz...' },
      isActive: true,
      lastSyncAt: new Date()
    }
  });

  await prisma.tenantIntegration.upsert({
    where: { tenantId_type_provider: { tenantId, type: 'B2C_ECOMMERCE', provider: 'SHOPIFY' } },
    update: {
      config: { storeUrl: 'my-store.myshopify.com', apiKey: 'shp...', apiSecret: 'shp_sec...' },
      isActive: true,
      lastSyncAt: daysAgo(1)
    },
    create: {
      tenantId,
      type: 'B2C_ECOMMERCE',
      provider: 'SHOPIFY',
      config: { storeUrl: 'my-store.myshopify.com', apiKey: 'shp...', apiSecret: 'shp_sec...' },
      isActive: true,
      lastSyncAt: daysAgo(1)
    }
  });

  console.log('✓ Ek modüller için veriler başarıyla yüklendi!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
