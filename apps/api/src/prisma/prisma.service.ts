import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  ALL_SUBMODULE_IDS,
  DEALER_DEFAULT_MODULES,
  PLATINUM_BUSINESS_MODULES,
} from '../common/module-catalog';

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
        where: { code: 'demo' },
        update: { isActive: true, parentId: dealer.id, plan: 'PLATINUM' },
        create: {
          code: 'demo',
          name: 'Demo İşletme',
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
        update: { password: demoHash, isActive: true, tenantId: business.id, role: 'OWNER' },
        create: {
          tenantId: business.id,
          email: 'isletme@demo.com',
          password: demoHash,
          name: 'Demo Yönetici',
          role: 'OWNER',
          isActive: true,
        },
      });

      const phoneDemoUsers = [
        { email: 'kasiyer@demo.com', phone: '5321234567', name: 'Demo Kasiyer', role: 'CASHIER' },
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
          },
          create: {
            tenantId: business.id,
            email: u.email,
            phone: u.phone,
            password: demoHash,
            name: u.name,
            role: u.role as any,
            isActive: true,
          },
        });
      }

      const tech = await this.tenant.upsert({
        where: { code: 'tech' },
        update: { isActive: true },
        create: {
          code: 'tech',
          name: 'Tech POS İşletmesi',
          type: 'BUSINESS',
          plan: 'BASIC',
          isActive: true,
        },
      });

      await this.user.upsert({
        where: { email: 'pos@tech.com' },
        update: { password: demoHash, isActive: true, tenantId: tech.id },
        create: {
          tenantId: tech.id,
          email: 'pos@tech.com',
          password: demoHash,
          name: 'Tech POS Kasiyer',
          role: 'STAFF',
          posPin: '1234',
          isActive: true,
        },
      });

      this.logger.log('Core demo accounts ensured (admin, bayi, isletme).');
    } catch (e) {
      this.logger.error('Failed to ensure core demo accounts', e);
    }
  }
}
