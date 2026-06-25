import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return { status: 'ok', service: 'smartnexus-api', timestamp: new Date().toISOString() };
  }

  @Get('seed')
  @Public()
  async seedAdmin() {
    const { PrismaClient } = require('@prisma/client');
    const argon2 = require('argon2');
    const { execSync } = require('child_process');
    const prisma = new PrismaClient();
    try {
      // Run migrations at runtime
      execSync('npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma');

      const pw = await argon2.hash('SmartNexus2026!');
      
      const tenant = await prisma.tenant.upsert({
        where: { id: 'ten-root' },
        update: {},
        create: {
          id: 'ten-root',
          type: 'SUPERADMIN',
          name: 'SmartNexus Platform',
          code: 'SNX-ROOT',
          plan: 'PLATINUM',
          email: 'admin@smartnexus.com',
          phone: '+90 212 555 0001',
          city: 'İstanbul',
        }
      });

      const user = await prisma.user.upsert({
        where: { email: 'admin@smartnexus.com' },
        update: { password: pw },
        create: {
          id: 'usr-root',
          tenantId: 'ten-root',
          email: 'admin@smartnexus.com',
          password: pw,
          name: 'Platform Yöneticisi',
          role: 'OWNER',
        }
      });
      return { success: true, message: 'Migrations applied and Admin seeded successfully' };
    } catch (e: any) {
      return { success: false, error: e.message, stack: e.stack, stdout: e.stdout ? e.stdout.toString() : '' };
    }
  }
}
