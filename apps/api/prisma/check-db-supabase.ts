import { PrismaClient } from '@prisma/client';

const dbUrl = "postgresql://postgres.mebbtlbrjsfdnwiuoocy:AMOKK83tr..@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { code: 'tech' } });
  if (tenant) {
    console.log('Tenant ID (UUID) for tech:', tenant.id);
  } else {
    console.log('Tenant "tech" not found in Supabase.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
