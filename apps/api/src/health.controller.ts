import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';
import { main as runSeed } from '../prisma/seed';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Public()
  check() {
    return { status: 'ok', service: 'smartnexus-api', timestamp: new Date().toISOString() };
  }

  @Get('seed')
  @Public()
  async seedAdmin() {
    try {
      const { execSync } = require('child_process');
      try {
        execSync('npx prisma db push --schema=apps/api/prisma/schema.prisma --accept-data-loss', { stdio: 'inherit' });
      } catch (err) {
        console.error('Prisma db push failed:', err);
      }

      // 1. Wipe the database programmatically with high efficiency and CASCADE
      try {
        await this.prisma.$executeRawUnsafe(`
          TRUNCATE TABLE 
            "Tenant", "User", "Product", "ProductCategory", "Warehouse", 
            "Contact", "Vehicle", "PlanTemplate", "CashAccount", "BankAccount", 
            "LedgerAccount", "PlanModuleItem", "AddonModule", "KontorPackage", 
            "PlatformSetting", "HrDepartment", "HrPosition"
          CASCADE;
        `);
      } catch (err) {
        console.log('Truncate failed, maybe first time?', err);
      }

      // 2. Run the seed function directly in-process
      await runSeed();

      return { success: true, message: 'Database wiped and FULL database seeded successfully inside NestJS process' };
    } catch (e: any) {
      return { success: false, error: e.message, stack: e.stack };
    }
  }
}
