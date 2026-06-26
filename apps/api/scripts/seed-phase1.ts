import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase 1 Seeding...');

  // 1. Get the root tenant
  const tenant = await prisma.tenant.findFirst({ where: { type: 'SUPERADMIN' } });
  if (!tenant) {
    throw new Error("Root tenant not found");
  }

  // 2. Create/Get a contact (Customer)
  const customer = await prisma.contact.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CUS-PHASE1-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'CUS-PHASE1-001',
      name: 'Global Tech Solutions A.Ş.',
      type: 'CUSTOMER',
      email: 'info@globaltech.example.com',
      phone: '+90 212 555 0001',
      city: 'Istanbul',
      balance: 0,
      isActive: true,
    }
  });

  // 3. Create Products for Sales
  const product1 = await prisma.product.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'PRD-LPT-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'PRD-LPT-001',
      name: 'Enterprise Laptop Pro X',
      type: 'GOODS',
      unit: 'PIECE',
      salePrice: 25000,
      purchasePrice: 18000,
      isActive: true,
    }
  });

  const product2 = await prisma.product.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'PRD-SVR-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'PRD-SVR-001',
      name: 'Rack Server 2U Gen10',
      type: 'GOODS',
      unit: 'PIECE',
      salePrice: 120000,
      purchasePrice: 85000,
      isActive: true,
    }
  });

  // 4. Create an Invoice (Integrated Sales)
  console.log('Creating 10 integrated invoices/sales...');
  
  for(let i=1; i<=10; i++) {
    const invoiceNumber = `INV-2026-PH1-${i.toString().padStart(3, '0')}`;
    
    // Check if invoice exists
    const existingInv = await prisma.invoice.findFirst({
      where: { tenantId: tenant.id, series: 'PH1', number: i }
    });

    if (!existingInv) {
      const isPaid = i % 2 === 0; // Every other invoice is paid
      const amount1 = (product1.salePrice || 0) * (Math.floor(Math.random() * 5) + 1);
      const amount2 = (product2.salePrice || 0) * (Math.floor(Math.random() * 2) + 1);
      const totalAmount = amount1 + amount2;

      await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          series: 'PH1',
          number: i,
          type: 'SALES',
          date: new Date(),
          dueDate: new Date(new Date().getTime() + 30*24*60*60*1000), // 30 days
          contactId: customer.id,
          subtotal: totalAmount,
          vatTotal: totalAmount * 0.20, // 20% VAT
          total: totalAmount * 1.20,
          status: isPaid ? 'PAID' : 'DRAFT',
          notes: 'Phase 1 Integrated Seeding',
          lines: {
            create: [
              {
                productId: product1.id,
                quantity: amount1 / (product1.salePrice || 1),
                unitPrice: product1.salePrice || 0,
                vatRate: 20,
                vatAmount: amount1 * 0.20,
                total: amount1 * 1.20,
                description: product1.name,
              },
              {
                productId: product2.id,
                quantity: amount2 / (product2.salePrice || 1),
                unitPrice: product2.salePrice || 0,
                vatRate: 20,
                vatAmount: amount2 * 0.20,
                total: amount2 * 1.20,
                description: product2.name,
              }
            ]
          }
        }
      });
      
      // Update Contact Balance if not paid
      if (!isPaid) {
        await prisma.contact.update({
          where: { id: customer.id },
          data: { balance: { increment: totalAmount * 1.20 } }
        });
      }

      // Add Bank/Cash transaction if paid
      if (isPaid) {
         // Create a bank account if missing
         const bank = await prisma.bankAccount.findFirst({
           where: { tenantId: tenant.id, iban: 'TR120000000000000000000001' }
         }) || await prisma.bankAccount.create({
           data: {
             tenantId: tenant.id,
             name: 'Phase 1 Bank',
             iban: 'TR120000000000000000000001',
             currency: 'TRY',
             balance: 0,
             accountNo: '123456'
           }
         });

         await prisma.bankTransaction.create({
           data: {
             tenantId: tenant.id,
             bankAccountId: bank.id,
             type: 'INCOME',
             amount: totalAmount * 1.20,
             description: `Payment for PH1-${i}`,
             createdAt: new Date()
           }
         });
         
         await prisma.bankAccount.update({
           where: { id: bank.id },
           data: { balance: { increment: totalAmount * 1.20 } }
         });
      }
    }
  }

  // 5. HR & Payroll Mock Data
  console.log('Creating HR & Payroll Mock Data...');
  const hrDept = await prisma.hrDepartment.findFirst({ where: { name: 'Yazılım Geliştirme' } }) 
    || await prisma.hrDepartment.create({ data: { tenantId: tenant.id, name: 'Yazılım Geliştirme' } });
  
  const hrPos = await prisma.hrPosition.findFirst({ where: { name: 'Kıdemli Yazılım Uzmanı' } })
    || await prisma.hrPosition.create({ data: { tenantId: tenant.id, name: 'Kıdemli Yazılım Uzmanı' } });

  for(let i=1; i<=10; i++) {
    const code = `EMP-00${i}`;
    const empContact = await prisma.contact.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code } },
      update: {},
      create: {
        tenantId: tenant.id,
        code,
        name: `Personel ${i}`,
        type: 'CUSTOMER',
        isPersonnel: true,
        email: `personel${i}@company.com`,
        balance: 0,
        isActive: true,
      }
    });

    const existingProfile = await prisma.personnelProfile.findUnique({
      where: { contactId: empContact.id }
    });

    if (!existingProfile) {
      await prisma.personnelProfile.create({
        data: {
          contactId: empContact.id,
          departmentId: hrDept.id,
          positionId: hrPos.id,
          hireDate: new Date('2023-01-01'),
          baseSalary: 50000 + (i * 1000),
          currency: 'TRY',
          leaveDaysTotal: 14,
          leaveDaysUsed: i % 14,
        }
      });
    }
  }

  console.log('Phase 1 Seeding Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
