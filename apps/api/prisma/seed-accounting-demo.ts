import { PrismaClient, ContactType } from '@prisma/client';

const prisma = new PrismaClient();

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('--- Finansal Demo Verisi Üretiliyor ---');
  const tenantId = 'ten-b1';

  // Veritabanını temizle (sadece ilgili tenant için)
  console.log('Eski finansal veriler temizleniyor...');
  await prisma.invoicePayment.deleteMany({ where: { invoice: { tenantId } } });
  await prisma.invoiceLine.deleteMany({ where: { invoice: { tenantId } } });
  await prisma.invoice.deleteMany({ where: { tenantId } });
  await prisma.checkRegister.deleteMany({ where: { tenantId } });
  await prisma.cashTransaction.deleteMany({ where: { cashAccount: { tenantId } } });

  // Mevcut ürünleri al
  const products = await prisma.product.findMany({ where: { tenantId } });
  if (products.length === 0) {
    console.log('Ürün bulunamadı, demo verisi üretilemiyor.');
    return;
  }

  // Kasa hesabı (Ödemeler için)
  let cashAcc = await prisma.cashAccount.findFirst({ where: { tenantId } });
  if (!cashAcc) {
    cashAcc = await prisma.cashAccount.create({
      data: { tenantId, name: 'Merkez Kasa', currency: 'TRY', balance: 0 },
    });
  }

  const contacts = await prisma.contact.findMany({ where: { tenantId } });
  console.log(`${contacts.length} adet cari için işlemler oluşturuluyor...`);

  for (const contact of contacts) {
    const isCustomer = contact.type === 'CUSTOMER' || contact.type === 'BOTH';
    const isSupplier = contact.type === 'SUPPLIER';

    const numInvoices = Math.floor(Math.random() * 5) + 3; // 3 to 7 invoices
    let currentBalance = 0;

    for (let i = 0; i < numInvoices; i++) {
      const type = isCustomer ? 'SALES' : 'PURCHASE';
      const date = randomDate(new Date(new Date().setMonth(new Date().getMonth() - 6)), new Date());
      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days term

      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 10) + 1;
      const unitPrice = isCustomer ? product.salePrice : (product.purchasePrice || product.salePrice * 0.7);
      const lineTotal = qty * unitPrice;
      const vatRate = product.vatRate || 20;
      const vatAmount = lineTotal * (vatRate / 100);
      const total = lineTotal + vatAmount;

      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          contactId: contact.id,
          type,
          status: 'APPROVED',
          date,
          dueDate,
          series: isCustomer ? 'INV' : 'PRC',
          number: Math.floor(Math.random() * 100000),
          subtotal: lineTotal,
          vatTotal: vatAmount,
          total: total,
          lines: {
            create: [
              {
                productId: product.id,
                description: product.name,
                quantity: qty,
                unitPrice: unitPrice,
                vatRate: vatRate,
                total: total,
              }
            ]
          }
        }
      });

      // Update contact running balance (Sales adds to balance (debt), Purchase reduces balance)
      currentBalance += isCustomer ? total : -total;

      // 70% chance to have some payment
      if (Math.random() > 0.3) {
        const payAmount = Math.random() > 0.5 ? total : total * (Math.random() * 0.5 + 0.3); // Full or partial
        
        // 30% chance payment is via Check, 70% via Cash
        if (Math.random() < 0.3) {
          // Check Payment
          const checkDueDate = new Date(date);
          checkDueDate.setDate(checkDueDate.getDate() + Math.floor(Math.random() * 60) + 15);
          
          await prisma.checkRegister.create({
            data: {
              tenantId,
              contactId: contact.id,
              direction: isCustomer ? 'INCOMING' : 'OUTGOING',
              bankName: 'Örnek Bankası',
              branchName: 'Merkez Şube',
              checkNo: Math.floor(Math.random() * 10000000).toString(),
              amount: payAmount,
              dueDate: checkDueDate,
              status: 'PENDING',
            }
          });

          await prisma.invoicePayment.create({
            data: {
              tenantId,
              invoiceId: invoice.id,
              amount: payAmount,
              paymentType: 'CHECK',
              paidAt: date,
              reference: 'Çek Tahsilatı',
            }
          });
        } else {
          // Cash Payment
          await prisma.cashTransaction.create({
            data: {
              tenantId,
              cashAccountId: cashAcc.id,
              type: isCustomer ? 'INCOME' : 'EXPENSE',
              amount: payAmount,
              createdAt: date,
              description: `${contact.name} Fatura Tahsilatı`,
            }
          });

          await prisma.invoicePayment.create({
            data: {
              tenantId,
              invoiceId: invoice.id,
              amount: payAmount,
              paymentType: 'CASH',
              cashAccountId: cashAcc.id,
              paidAt: date,
              reference: 'Nakit',
            }
          });

          await prisma.cashAccount.update({
            where: { id: cashAcc.id },
            data: { balance: { increment: isCustomer ? payAmount : -payAmount } }
          });
        }

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { 
            status: payAmount >= total ? 'PAID' : 'PARTIAL'
          }
        });

        // Payment reduces debt for customer, increases our balance for supplier
        currentBalance -= isCustomer ? payAmount : -payAmount;
      }
    }

    // Set contact exact balance
    await prisma.contact.update({
      where: { id: contact.id },
      data: { balance: currentBalance }
    });
  }

  console.log('✓ Finansal demo işlemleri başarıyla tamamlandı!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
