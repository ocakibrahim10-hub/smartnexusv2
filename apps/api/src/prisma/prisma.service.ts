import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.seedTechTenant();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async seedTechTenant() {
    try {
      // 1. Tech Firması (Standart giriş için)
      const tenant = await this.tenant.upsert({
        where: { code: 'tech' },
        update: {},
        create: {
          code: 'tech',
          name: 'Tech POS İşletmesi',
          type: 'BUSINESS',
          plan: 'BASIC',
          isActive: true,
        },
      });

      const existingUser = await this.user.findFirst({
        where: { tenantId: tenant.id, email: 'pos@tech.com' },
      });

      if (!existingUser) {
        const password = await argon2.hash('123456');
        await this.user.create({
          data: {
            tenantId: tenant.id,
            email: 'pos@tech.com',
            password,
            name: 'Tech POS Kasiyer',
            role: 'STAFF',
            posPin: '1234',
            isActive: true,
          },
        });
        this.logger.log('Tech tenant and POS user created.');
      }

      // 2. Demo Firması (İşletme paneli girişi için)
      const demoTenant = await this.tenant.upsert({
        where: { code: 'demo' },
        update: {},
        create: {
          code: 'demo',
          name: 'Demo İşletme',
          type: 'BUSINESS',
          plan: 'PLATINUM',
          isActive: true,
        },
      });

      const existingDemoUser = await this.user.findFirst({
        where: { tenantId: demoTenant.id, email: 'isletme@demo.com' },
      });

      if (!existingDemoUser) {
        const demoPassword = await argon2.hash('123456');
        await this.user.create({
          data: {
            tenantId: demoTenant.id,
            email: 'isletme@demo.com',
            password: demoPassword,
            name: 'Demo Yönetici',
            role: 'ADMIN',
            isActive: true,
          },
        });

        // Diğer telefonlu demo kullanıcıları
        const phoneDemoUsers = [
          { email: 'kasiyer@demo.com', phone: '5321234567', name: 'Demo Kasiyer', role: 'CASHIER' },
          { email: 'depo@demo.com', phone: '5321234568', name: 'Demo Depo', role: 'WAREHOUSE' },
          { email: 'sofor@demo.com', phone: '5321234569', name: 'Demo Şoför', role: 'DRIVER' },
          { email: 'personel@demo.com', phone: '5321234570', name: 'Demo Personel', role: 'STAFF' },
        ];

        for (const u of phoneDemoUsers) {
          const exists = await this.user.findFirst({ where: { email: u.email } });
          if (!exists) {
            await this.user.create({
              data: {
                tenantId: demoTenant.id,
                email: u.email,
                phone: u.phone,
                password: demoPassword,
                name: u.name,
                role: u.role as any,
                isActive: true,
              },
            });
          }
        }
        
        this.logger.log('Demo tenant and all isletme users created.');
      }
    } catch (e) {
      this.logger.error('Failed to seed tenants', e);
    }
  }
}
