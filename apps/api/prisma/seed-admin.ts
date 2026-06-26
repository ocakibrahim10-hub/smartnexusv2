import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting admin data seed...');
  const tenRootId = 'ten-root';
  const tenB1Id = 'ten-b1';

  // Seed everything necessary for admin to see products and BOMs
  const products = await prisma.product.findMany({ where: { tenantId: tenB1Id } });
  
  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_code: { tenantId: tenRootId, code: p.code } },
      update: {},
      create: { 
        tenantId: tenRootId,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand,
        unit: p.unit,
        salePrice: p.salePrice,
        purchasePrice: p.purchasePrice,
        taxRate: p.taxRate,
        barcode: p.barcode,
        type: p.type,
      }
    });
  }
  
  const rootProducts = await prisma.product.findMany({ where: { tenantId: tenRootId } });
  
  // Seed BOMs
  const boms = await prisma.mrpBom.findMany({ where: { tenantId: tenB1Id }, include: { items: true } });
  for (const bom of boms) {
    const rootP = rootProducts.find(rp => rp.code === products.find(op => op.id === bom.productId)?.code);
    if (!rootP) continue;
    
    await prisma.mrpBom.upsert({
      where: { tenantId_code: { tenantId: tenRootId, code: bom.code } },
      update: {},
      create: {
        tenantId: tenRootId,
        code: bom.code,
        name: bom.name,
        quantity: bom.quantity,
        productId: rootP.id,
        items: {
          create: bom.items.map(item => {
             const rootItemP = rootProducts.find(rp => rp.code === products.find(op => op.id === item.productId)?.code);
             return {
                productId: rootItemP?.id || rootProducts[0].id,
                quantity: item.quantity,
                unit: item.unit
             };
          })
        }
      }
    });
  }

  console.log('Admin data seeded.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
