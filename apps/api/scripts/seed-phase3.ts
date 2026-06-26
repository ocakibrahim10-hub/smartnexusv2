import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase 3 Seeding (MRP & Transfers)...');

  const tenant = await prisma.tenant.findFirst({ where: { type: 'SUPERADMIN' } });
  if (!tenant) {
    throw new Error("Root tenant not found");
  }

  // Ensure Warehouses exist
  let wMain = await prisma.warehouse.findFirst({ where: { tenantId: tenant.id, code: 'WH-MAIN' } });
  if (!wMain) {
    wMain = await prisma.warehouse.create({
      data: { tenantId: tenant.id, name: 'Merkez Depo', code: 'WH-MAIN', isDefault: true }
    });
  }

  let wProd = await prisma.warehouse.findFirst({ where: { tenantId: tenant.id, code: 'WH-PROD' } });
  if (!wProd) {
    wProd = await prisma.warehouse.create({
      data: { tenantId: tenant.id, name: 'Üretim Deposu', code: 'WH-PROD' }
    });
  }

  console.log('Creating Raw Materials, Semi-Finished and Finished Goods...');
  
  // Create Products
  const createProduct = async (code: string, name: string, isRaw: boolean = false) => {
    let p = await prisma.product.findFirst({ where: { tenantId: tenant.id, code } });
    if (!p) {
      p = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          code,
          name,
          type: 'GOODS',
          unit: isRaw ? 'KG' : 'PIECE',
          salePrice: isRaw ? 50 : 500,
          purchasePrice: isRaw ? 20 : 200,
          isActive: true,
        }
      });
    }
    return p;
  };

  const pRaw1 = await createProduct('PRD-RAW-001', 'Ahşap Hammadde', true);
  const pRaw2 = await createProduct('PRD-RAW-002', 'Metal Aksam', true);
  const pSemi = await createProduct('PRD-SEM-001', 'Masa İskeleti');
  const pFin = await createProduct('PRD-FIN-001', 'Premium Ahşap Masa');

  // Create Bill of Materials
  console.log('Creating Bill of Materials (BOM)...');
  
  // 1. Semi-finished BOM
  let bomSemi = await prisma.billOfMaterial.findFirst({ where: { tenantId: tenant.id, code: 'BOM-SEM-001' } });
  if (!bomSemi) {
    bomSemi = await prisma.billOfMaterial.create({
      data: {
        tenantId: tenant.id,
        code: 'BOM-SEM-001',
        name: 'Masa İskeleti Reçetesi',
        productId: pSemi.id,
        quantity: 1,
        items: {
          create: [
            { productId: pRaw1.id, quantity: 2, unit: 'KG' },
            { productId: pRaw2.id, quantity: 0.5, unit: 'KG' }
          ]
        }
      }
    });
  }

  // 2. Finished product BOM
  let bomFin = await prisma.billOfMaterial.findFirst({ where: { tenantId: tenant.id, code: 'BOM-FIN-001' } });
  if (!bomFin) {
    bomFin = await prisma.billOfMaterial.create({
      data: {
        tenantId: tenant.id,
        code: 'BOM-FIN-001',
        name: 'Premium Ahşap Masa Reçetesi',
        productId: pFin.id,
        quantity: 1,
        items: {
          create: [
            { productId: pSemi.id, quantity: 1, unit: 'PIECE' },
            { productId: pRaw1.id, quantity: 1, unit: 'KG' } // Ekstra cila vs. için ahşap kaplama
          ]
        }
      }
    });
  }

  // Create Work Orders
  console.log('Creating 10 Work Orders...');
  for (let i = 1; i <= 10; i++) {
    const code = `WO-${new Date().getFullYear()}-000${i}`;
    const existingWo = await prisma.workOrder.findFirst({ where: { tenantId: tenant.id, code } });
    if (!existingWo) {
      const isFin = i % 2 === 0;
      const targetBom = isFin ? bomFin : bomSemi;
      const status = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'][i % 3];

      await prisma.workOrder.create({
        data: {
          tenantId: tenant.id,
          code,
          bomId: targetBom.id,
          status,
          quantity: Math.floor(Math.random() * 50) + 10,
          plannedDate: new Date(),
          items: {
            create: targetBom.id === bomSemi.id 
              ? [
                  { productId: pRaw1.id, quantity: 2, type: 'MATERIAL' },
                  { productId: pRaw2.id, quantity: 0.5, type: 'MATERIAL' }
                ]
              : [
                  { productId: pSemi.id, quantity: 1, type: 'MATERIAL' },
                  { productId: pRaw1.id, quantity: 1, type: 'MATERIAL' }
                ]
          }
        }
      });
    }
  }

  // Create Stock Transfers
  console.log('Creating 5 Stock Transfers...');
  for (let i = 1; i <= 5; i++) {
    const existingTr = await prisma.stockTransfer.findFirst({ where: { fromTenantId: tenant.id, toTenantId: tenant.id, notes: `TR-00${i}` } });
    if (!existingTr) {
      const status: any = ['DRAFT', 'APPROVED', 'SHIPPED', 'RECEIVED'][i % 4];
      await prisma.stockTransfer.create({
        data: {
          fromTenantId: tenant.id,
          toTenantId: tenant.id,
          fromWarehouseId: wMain.id,
          toWarehouseId: wProd.id,
          status,
          notes: `TR-00${i}`,
          lines: {
            create: [
              { productId: pRaw1.id, quantity: 100 * i },
              { productId: pRaw2.id, quantity: 50 * i }
            ]
          }
        }
      });
    }
  }

  console.log('Phase 3 Seeding Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
