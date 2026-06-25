import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { cliLog, cliError } from './cli-log';

const prisma = new PrismaClient();
const DEMO_PASSWORD = '123456';

async function main() {
  cliLog(`🔑 Tüm demo şifreleri "${DEMO_PASSWORD}" olarak güncelleniyor...\n`);

  const hash = await argon2.hash(DEMO_PASSWORD);
  const result = await prisma.user.updateMany({
    data: { password: hash },
  });

  cliLog(`✓ ${result.count} kullanıcı güncellendi`);
  cliLog(`\nŞifre (hepsi): ${DEMO_PASSWORD}\n`);

  const users = await prisma.user.findMany({
    select: { email: true, phone: true, name: true, role: true },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
  });

  cliLog('── Yönetici / Bayi / İşletme ──');
  for (const u of users.filter((x) => !x.phone)) {
    cliLog(`  ${u.email.padEnd(28)} ${u.name} (${u.role})`);
  }

  cliLog('\n── Personel (telefon ile giriş) ──');
  for (const u of users.filter((x) => x.phone)) {
    cliLog(`  ${u.phone?.padEnd(14)} ${u.email.padEnd(24)} ${u.name} (${u.role})`);
  }
}

main()
  .catch((e) => {
    cliError(`HATA: ${e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
