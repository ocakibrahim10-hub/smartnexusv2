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
    } catch (e) {
      this.logger.error('Failed to seed tech tenant', e);
    }
  }
}
