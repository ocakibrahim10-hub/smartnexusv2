import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const existingTenant = await prisma.tenant.findUnique({ where: { code: 'tech' } });
  
  if (existingTenant) {
    console.log('Tenant "tech" already exists.');
    
    // posPin güncelle
    await prisma.user.updateMany({
      where: { tenantId: existingTenant.id },
      data: { posPin: '1234' }
    });
    console.log('Updated users under "tech" with posPin "1234"');
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      code: 'tech',
      name: 'Tech POS İşletmesi',
      type: 'BUSINESS',
      plan: 'BASIC',
      isActive: true,
    }
  });
  console.log('Created tenant:', tenant.code);

  const password = await argon2.hash('123456');

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'pos@tech.com',
      password,
      name: 'Tech POS Kasiyer',
      role: 'STAFF',
      posPin: '1234',
      isActive: true,
    }
  });

  console.log('Created user:', user.email, 'with POS PIN:', user.posPin);
}

main().catch(console.error).finally(() => prisma.$disconnect());
