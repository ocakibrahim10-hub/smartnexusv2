import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase 2 Seeding (Variants & POS)...');

  const tenant = await prisma.tenant.findFirst({ where: { type: 'SUPERADMIN' } });
  if (!tenant) {
    throw new Error("Root tenant not found");
  }

  const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) {
    throw new Error("No user found for POS session");
  }

  // 1. Create Variant Products (Clothing)
  console.log('Creating Master and Variant Products...');
  
  const masterCode = 'PRD-CLO-001';
  let masterProduct = await prisma.product.findFirst({ where: { tenantId: tenant.id, code: masterCode } });
  
  if (!masterProduct) {
    masterProduct = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        code: masterCode,
        name: 'Basic Cotton T-Shirt',
        type: 'GOODS',
        unit: 'PIECE',
        salePrice: 250,
        purchasePrice: 100,
        isActive: true,
      }
    });
  }

  const variants = [
    { code: 'PRD-CLO-001-RS', name: 'Basic Cotton T-Shirt (Kırmızı - S)', color: 'Kırmızı', size: 'S' },
    { code: 'PRD-CLO-001-RM', name: 'Basic Cotton T-Shirt (Kırmızı - M)', color: 'Kırmızı', size: 'M' },
    { code: 'PRD-CLO-001-BS', name: 'Basic Cotton T-Shirt (Mavi - S)', color: 'Mavi', size: 'S' },
    { code: 'PRD-CLO-001-BM', name: 'Basic Cotton T-Shirt (Mavi - M)', color: 'Mavi', size: 'M' },
  ];

  const variantIds: string[] = [];

  for (const v of variants) {
    let vp = await prisma.product.findFirst({ where: { tenantId: tenant.id, code: v.code } });
    if (!vp) {
      vp = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          code: v.code,
          name: v.name,
          type: 'GOODS',
          unit: 'PIECE',
          salePrice: 250,
          purchasePrice: 100,
          isActive: true,
          parentProductId: masterProduct.id,
          description: `Renk: ${v.color}, Beden: ${v.size}`,
        }
      });
    }
    variantIds.push(vp.id);
  }

  // 2. Create POS Session and Receipts
  console.log('Creating POS Session and Receipts...');
  
  const session = await prisma.pOSSession.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      openedAt: new Date(new Date().setHours(8, 0, 0, 0)),
      openingCash: 1000,
      notes: 'Morning Shift',
    }
  });

  let totalSales = 0;
  let receiptCount = 0;

  for (let i = 1; i <= 10; i++) {
    const isCash = i % 2 === 0;
    const qty = Math.floor(Math.random() * 3) + 1;
    const vId = variantIds[i % variantIds.length];
    const totalAmount = 250 * qty;
    
    await prisma.pOSReceipt.create({
      data: {
        tenantId: tenant.id,
        sessionId: session.id,
        receiptNo: `POS-${new Date().getFullYear()}-${1000 + i}`,
        subtotal: totalAmount / 1.20,
        vatTotal: totalAmount - (totalAmount / 1.20),
        total: totalAmount,
        paymentType: isCash ? 'CASH' : 'CARD',
        cashGiven: isCash ? totalAmount + 50 : null,
        changeAmount: isCash ? 50 : null,
        lines: {
          create: [
            {
              productId: vId,
              quantity: qty,
              unitPrice: 250 / 1.20,
              vatRate: 20,
              vatAmount: totalAmount - (totalAmount / 1.20),
              total: totalAmount,
            }
          ]
        }
      }
    });

    totalSales += totalAmount;
    receiptCount++;
  }

  // Close the session
  await prisma.pOSSession.update({
    where: { id: session.id },
    data: {
      closedAt: new Date(),
      closingCash: 1000 + (totalSales / 2), // Rough estimate for cash part
      totalSales,
      receiptCount,
    }
  });

  console.log(`Phase 2 Seeding Complete! Total POS Sales: ${totalSales} TRY across ${receiptCount} receipts.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
