const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.$executeRawUnsafe(`UPDATE vehicles SET "driverId" = NULL`);
  await prisma.$executeRawUnsafe(`UPDATE shipments SET "driverId" = NULL`);
  console.log('Fixed vehicles and shipments');
}

run().catch(console.error).finally(() => prisma.$disconnect());
