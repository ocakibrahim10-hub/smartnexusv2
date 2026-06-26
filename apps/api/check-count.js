const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://smartnexus_db_user:p9xCPGcdRmDoel9oKfH5bi1qe6bWTUWx@dpg-d8udld3tqb8s73b53ejg-a/smartnexus_db'
    }
  }
});
async function main() {
  const users = await prisma.user.count();
  console.log('Total users:', users);
  const contacts = await prisma.contact.count();
  console.log('Total contacts:', contacts);
  const products = await prisma.product.count();
  console.log('Total products:', products);
}
main().finally(() => prisma.$disconnect());
