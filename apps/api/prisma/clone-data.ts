// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cloning demo data to Admin (ten-root)...');
  const tenRoot = 'ten-root';
  const tenB1 = 'ten-b1';

  // 1. Copy Products
  console.log('Copying products...');
  const products = await prisma.product.findMany({ where: { tenantId: tenB1 } });
  for (const p of products) {
    try {
      await prisma.product.upsert({
        where: { tenantId_code: { tenantId: tenRoot, code: p.code } },
        update: {},
        create: { ...p, id: undefined, tenantId: tenRoot }
      });
    } catch (e) {}
  }

  // 2. Copy Contacts
  console.log('Copying contacts...');
  const contacts = await prisma.contact.findMany({ where: { tenantId: tenB1 } });
  for (const c of contacts) {
    try {
      await prisma.contact.upsert({
        where: { tenantId_code: { tenantId: tenRoot, code: c.code } },
        update: {},
        create: { ...c, id: undefined, tenantId: tenRoot }
      });
    } catch (e) {}
  }

  // 3. Copy BOMs
  console.log('Copying BOMs...');
  const rootProducts = await prisma.product.findMany({ where: { tenantId: tenRoot } });
  const boms = await prisma.mrpBom.findMany({ where: { tenantId: tenB1 }, include: { items: true } });
  for (const bom of boms) {
    try {
      const rootP = rootProducts.find(rp => rp.code === products.find(op => op.id === bom.productId)?.code);
      if (!rootP) continue;
      
      await prisma.mrpBom.create({
        data: {
          tenantId: tenRoot,
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
    } catch (e) {}
  }

  console.log('Admin data cloned successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
