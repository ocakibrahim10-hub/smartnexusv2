import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  ALL_SUBMODULE_IDS,
  DEALER_DEFAULT_MODULES,
  PLATINUM_BUSINESS_MODULES,
} from '../common/module-catalog';
import { main as runFullDemoSeed } from '../../prisma/seed';

const DEMO_PASSWORD = '123456';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureCoreDemoAccounts();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Canlı ortamda admin/bayi/işletme demo hesaplarını garanti eder */
  async ensureCoreDemoAccounts() {
    try {
      const demoHash = await argon2.hash(DEMO_PASSWORD);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const root = await this.tenant.upsert({
        where: { code: 'SNX-ROOT' },
        update: { isActive: true, type: 'SUPERADMIN', plan: 'PLATINUM' },
        create: {
          id: 'ten-root',
          code: 'SNX-ROOT',
          name: 'SmartNexus Platform',
          type: 'SUPERADMIN',
          plan: 'PLATINUM',
          email: 'admin@smartnexus.com',
          city: 'İstanbul',
          isActive: true,
        },
      });

      await this.subscription.upsert({
        where: { tenantId: root.id },
        update: { endDate, modules: ALL_SUBMODULE_IDS, plan: 'PLATINUM', price: 0 },
        create: {
          tenantId: root.id,
          plan: 'PLATINUM',
          startDate: new Date(),
          endDate,
          autoRenew: true,
          price: 0,
          modules: ALL_SUBMODULE_IDS,
        },
      });

      await this.user.upsert({
        where: { email: 'admin@smartnexus.com' },
        update: { password: demoHash, isActive: true, tenantId: root.id, role: 'OWNER' },
        create: {
          id: 'usr-root',
          tenantId: root.id,
          email: 'admin@smartnexus.com',
          password: demoHash,
          name: 'Platform Yöneticisi',
          role: 'OWNER',
          isActive: true,
        },
      });

      const dealer = await this.tenant.upsert({
        where: { code: 'SNX-IST' },
        update: { isActive: true, parentId: root.id },
        create: {
          id: 'ten-d1',
          code: 'SNX-IST',
          name: 'İstanbul Bölge Bayisi',
          type: 'DEALER',
          plan: 'PLATINUM',
          email: 'bayi@demo.com',
          city: 'İstanbul',
          parentId: root.id,
          isActive: true,
        },
      });

      await this.subscription.upsert({
        where: { tenantId: dealer.id },
        update: { endDate, modules: DEALER_DEFAULT_MODULES, plan: 'PLATINUM' },
        create: {
          tenantId: dealer.id,
          plan: 'PLATINUM',
          startDate: new Date(),
          endDate,
          autoRenew: true,
          price: 0,
          modules: DEALER_DEFAULT_MODULES,
        },
      });

      await this.user.upsert({
        where: { email: 'bayi@demo.com' },
        update: { password: demoHash, isActive: true, tenantId: dealer.id, role: 'OWNER' },
        create: {
          id: 'usr-d1',
          tenantId: dealer.id,
          email: 'bayi@demo.com',
          password: demoHash,
          name: 'Ali Kaya',
          role: 'OWNER',
          isActive: true,
        },
      });

      const business = await this.tenant.upsert({
        where: { id: 'ten-b1' },
        update: {
          isActive: true,
          parentId: dealer.id,
          plan: 'PLATINUM',
          code: 'IST-TM001',
          email: 'isletme@demo.com',
          name: 'Teknoloji Market A.Ş.',
        },
        create: {
          id: 'ten-b1',
          code: 'IST-TM001',
          name: 'Teknoloji Market A.Ş.',
          type: 'BUSINESS',
          plan: 'PLATINUM',
          email: 'isletme@demo.com',
          parentId: dealer.id,
          isActive: true,
        },
      });

      await this.subscription.upsert({
        where: { tenantId: business.id },
        update: { endDate, modules: PLATINUM_BUSINESS_MODULES, plan: 'PLATINUM' },
        create: {
          tenantId: business.id,
          plan: 'PLATINUM',
          startDate: new Date(),
          endDate,
          autoRenew: true,
          price: 0,
          modules: PLATINUM_BUSINESS_MODULES,
        },
      });

      await this.user.upsert({
        where: { email: 'isletme@demo.com' },
        update: {
          password: demoHash,
          isActive: true,
          tenantId: business.id,
          role: 'OWNER',
          posPin: '1234',
        },
        create: {
          tenantId: business.id,
          email: 'isletme@demo.com',
          password: demoHash,
          name: 'Demo Yönetici',
          role: 'OWNER',
          posPin: '1234',
          isActive: true,
        },
      });

      const phoneDemoUsers = [
        { email: 'kasiyer@demo.com', phone: '5321234567', name: 'Demo Kasiyer', role: 'CASHIER', posPin: '1234' },
        { email: 'depo@demo.com', phone: '5321234568', name: 'Demo Depo', role: 'WAREHOUSE' },
        { email: 'sofor@demo.com', phone: '5321234569', name: 'Demo Şoför', role: 'DRIVER' },
        { email: 'personel@demo.com', phone: '5321234570', name: 'Demo Personel', role: 'STAFF' },
      ];

      for (const u of phoneDemoUsers) {
        await this.user.upsert({
          where: { email: u.email },
          update: {
            password: demoHash,
            isActive: true,
            tenantId: business.id,
            phone: u.phone,
            role: u.role as any,
            posPin: (u as any).posPin || null,
          },
          create: {
            tenantId: business.id,
            email: u.email,
            phone: u.phone,
            password: demoHash,
            name: u.name,
            role: u.role as any,
            posPin: (u as any).posPin || null,
            isActive: true,
          },
        });
      }

      const tech = await this.tenant.upsert({
        where: { id: 'ten-tech-pos' },
        update: { isActive: true, code: 'tech', name: 'Tech POS İşletmesi' },
        create: {
          id: 'ten-tech-pos',
          code: 'tech',
          name: 'Tech POS İşletmesi',
          type: 'BUSINESS',
          plan: 'PLATINUM',
          isActive: true,
        },
      });

      await this.subscription.upsert({
        where: { tenantId: tech.id },
        update: { endDate, modules: PLATINUM_BUSINESS_MODULES, plan: 'PLATINUM' },
        create: {
          tenantId: tech.id,
          plan: 'PLATINUM',
          startDate: new Date(),
          endDate,
          autoRenew: true,
          price: 0,
          modules: PLATINUM_BUSINESS_MODULES,
        },
      });

      await this.user.upsert({
        where: { email: 'pos@tech.com' },
        update: { password: demoHash, isActive: true, tenantId: tech.id, posPin: '1234' },
        create: {
          tenantId: tech.id,
          email: 'pos@tech.com',
          password: demoHash,
          name: 'Tech POS Kasiyer',
          role: 'CASHIER',
          posPin: '1234',
          isActive: true,
        },
      });

      this.logger.log('Core demo accounts hazır.');
    } catch (e) {
      this.logger.error('Failed to ensure core demo accounts', e);
    }
  }

  /** Mini seed / çakışan kayıtları temizle, tam seed öncesi */
  private async prepareTenB1ForFullSeed() {
    const tenantId = 'ten-b1';
    await this.cleanupMiniDemoClashes(tenantId);
    await this.stockItem.deleteMany({ where: { tenantId } });
    await this.productUnit.deleteMany({ where: { product: { tenantId } } });
    await this.product.deleteMany({ where: { tenantId } });
    await this.productCategory.deleteMany({ where: { tenantId } });
  }

  private async cleanupMiniDemoClashes(tenantId: string) {
    const prefix = `${tenantId}-`;
    const clashProducts = await this.product.findMany({
      where: { tenantId, id: { startsWith: prefix } },
      select: { id: true },
    });
    if (clashProducts.length) {
      const ids = clashProducts.map((p) => p.id);
      await this.stockItem.deleteMany({ where: { productId: { in: ids } } });
      await this.product.deleteMany({ where: { id: { in: ids } } });
    }
    await this.productCategory.deleteMany({ where: { tenantId, id: { startsWith: prefix } } });
    await this.contact.deleteMany({ where: { tenantId, id: { startsWith: prefix } } });
    await this.warehouse.deleteMany({ where: { tenantId, id: { startsWith: prefix } } });
    await this.cashAccount.deleteMany({ where: { tenantId, id: { startsWith: prefix } } });
  }

  /** Tam demo veri seti (seed.ts) — fix-demo endpoint */
  async seedDemoBusinessData() {
    this.logger.log('Tam demo seed başlıyor (ürün, cari, fatura, POS, TMS, HR...)');
    await this.prepareTenB1ForFullSeed();
    await runFullDemoSeed();
    const [products, contacts, invoices, vehicles] = await Promise.all([
      this.product.count({ where: { tenantId: 'ten-b1', isActive: true } }),
      this.contact.count({ where: { tenantId: 'ten-b1', isActive: true } }),
      this.invoice.count({ where: { tenantId: 'ten-b1' } }),
      this.vehicle.count({ where: { tenantId: 'ten-b1' } }),
    ]);
    return {
      tenB1: { products, contacts, invoices, vehicles },
      message: 'Tam seed tamamlandı',
    };
  }
}
