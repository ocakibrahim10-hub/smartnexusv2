import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { cliLog, cliError } from './cli-log';

const prisma = new PrismaClient();

async function main() {
  cliLog('🔑 Demo kullanıcı şifreleri düzeltiliyor...\n');

  const entries: Array<{ email: string; password: string }> = [
    { email: 'admin@smartnexus.com', password: 'SmartNexus2026!' },
    { email: 'bayi@demo.com', password: 'Bayi2026!' },
    { email: 'ankara.bayi@demo.com', password: 'Bayi2026!' },
    { email: 'isletme@demo.com', password: 'Isletme2026!' },
    { email: 'muhasebe@demo.com', password: 'Isletme2026!' },
    { email: 'kasiyer@demo.com', password: 'Isletme2026!' },
    { email: 'depo@demo.com', password: 'Isletme2026!' },
    { email: 'sofor@demo.com', password: 'Isletme2026!' },
    { email: 'ofis@demo.com', password: 'Isletme2026!' },
    { email: 'sube@demo.com', password: 'Sube2026!' },
    { email: 'besiktas@demo.com', password: 'Sube2026!' },
  ];

  for (const entry of entries) {
    const hash = await argon2.hash(entry.password);
    const result = await prisma.user.updateMany({
      where: { email: entry.email },
      data: { password: hash },
    });
    if (result.count > 0) {
      cliLog(`✓ ${entry.email}`);
    } else {
      cliLog(`⚠ ${entry.email} bulunamadi - once seed calistirin`);
    }
  }

  cliLog('\n✅ Tum sifreler guncellendi!');
  cliLog('\nGiris bilgileri:');
  cliLog('  admin@smartnexus.com  /  SmartNexus2026!');
  cliLog('  bayi@demo.com         /  Bayi2026!');
  cliLog('  isletme@demo.com      /  Isletme2026!');
}

main()
  .catch((e) => {
    cliError(`HATA: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
