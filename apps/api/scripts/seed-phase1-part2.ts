import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase 1 Part 2 Seeding (CRM & B2B)...');

  const tenant = await prisma.tenant.findFirst({ where: { type: 'SUPERADMIN' } });
  if (!tenant) {
    throw new Error("Root tenant not found");
  }

  // Seed Leads
  console.log('Creating 10 CRM Leads...');
  for (let i = 1; i <= 10; i++) {
    const email = `lead${i}@example.com`;
    const existingLead = await prisma.lead.findFirst({ where: { tenantId: tenant.id, email } });
    if (!existingLead) {
      await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          name: `Potansiyel Müşteri ${i} Soyad ${i}`,
          email,
          phone: `0532${1000000 + i}`,
          company: `Şirket ${i} A.Ş.`,
          status: ['NEW', 'CONTACTED', 'QUALIFIED'][i % 3] as any,
        }
      });
    }
  }

  // Get some products and contacts for B2B Orders
  const products = await prisma.product.findMany({ where: { tenantId: tenant.id }, take: 2 });
  const customers = await prisma.contact.findMany({ where: { tenantId: tenant.id, type: 'CUSTOMER' }, take: 3 });

  if (products.length > 0 && customers.length > 0) {
    console.log('Creating 10 B2B Orders...');
    for (let i = 1; i <= 10; i++) {
      const code = `B2B-ORD-${2000 + i}`;
      const existingB2B = await prisma.b2BOrder.findFirst({ where: { tenantId: tenant.id, code } });
      if (!existingB2B) {
        const customer = customers[i % customers.length];
        const p = products[i % products.length];
        const qty = Math.floor(Math.random() * 10) + 1;
        const total = (p.salePrice || 1000) * qty;

        await prisma.b2BOrder.create({
          data: {
            tenantId: tenant.id,
            contactId: customer.id,
            code,
            status: ['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERED'][i % 4] as any,
            subtotal: total,
            vatTotal: total * 0.20,
            total: total * 1.20,
            notes: 'B2B Portal Siparişi',
            lines: {
              create: [
                {
                  productId: p.id,
                  quantity: qty,
                  unitPrice: p.salePrice || 1000,
                  vatRate: 20,
                  vatAmount: total * 0.20,
                  total: total * 1.20,
                }
              ]
            }
          }
        });
      }
    }
  }

  console.log('Phase 1 Part 2 Seeding Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
