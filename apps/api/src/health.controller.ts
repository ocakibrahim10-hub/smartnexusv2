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
      // 1. Wipe the database programmatically with high efficiency and CASCADE
      // This is extremely fast and uses zero extra memory, preventing OOM on Render
      await this.prisma.$executeRawUnsafe(`
        TRUNCATE TABLE 
          "Tenant", "User", "Product", "ProductCategory", "Warehouse", 
          "Contact", "Vehicle", "PlanTemplate", "CashAccount", "BankAccount", 
          "LedgerAccount", "PlanModuleItem", "AddonModule", "KontorPackage", 
          "PlatformSetting", "HrDepartment", "HrPosition"
        CASCADE;
      `);

      // 2. Run the seed function directly in-process
      await runSeed();

      return { success: true, message: 'Database wiped and FULL database seeded successfully inside NestJS process' };
    } catch (e: any) {
      return { success: false, error: e.message, stack: e.stack };
    }
  }
}
