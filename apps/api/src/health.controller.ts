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

  @Get('fix-demo')
  @Public()
  async fixDemo() {
    try {
      await this.prisma.ensureCoreDemoAccounts();
      const stats = await this.prisma.seedDemoBusinessData();
      return {
        success: true,
        stats,
        message:
          'Demo hesaplar, stok, cari ve POS ürünleri güncellendi (admin/bayi/isletme — şifre: 123456)',
      };
    } catch (e: any) {
      return { success: false, error: e.message, stack: e.stack?.split?.('\n')?.slice(0, 8) };
    }
  }

  @Get('demo-status')
  @Public()
  async demoStatus() {
    const [tenB1Products, tenB1Contacts, tenB1Categories, techProducts] = await Promise.all([
      this.prisma.product.count({ where: { tenantId: 'ten-b1', isActive: true } }),
      this.prisma.contact.count({ where: { tenantId: 'ten-b1', isActive: true } }),
      this.prisma.productCategory.count({ where: { tenantId: 'ten-b1' } }),
      this.prisma.product.count({ where: { tenantId: 'ten-tech-pos', isActive: true } }),
    ]);
    return {
      tenB1: { products: tenB1Products, contacts: tenB1Contacts, categories: tenB1Categories },
      tech: { products: techProducts },
    };
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
            "PlatformSetting", "HrDepartment", "HrPosition",
            "bill_of_materials", "bom_items", "work_orders", "work_order_items",
            "personnel_profiles", "leave_requests", "payroll_slips"
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
