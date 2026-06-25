import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class B2cService {
  constructor(private prisma: PrismaService) {}

  async getB2cIntegrations(tenantId: string) {
    return this.prisma.tenantIntegration.findMany({
      where: { tenantId, type: 'B2C_ECOMMERCE' as any }, // Assuming B2C_ECOMMERCE added to enum
    });
  }

  async setupIntegration(tenantId: string, provider: string, config: any) {
    return this.prisma.tenantIntegration.upsert({
      where: {
        tenantId_type_provider: {
          tenantId,
          type: 'B2C_ECOMMERCE' as any,
          provider,
        },
      },
      update: { config },
      create: {
        tenantId,
        type: 'B2C_ECOMMERCE' as any,
        provider,
        config,
      },
    });
  }

  async handleWebhook(provider: string, payload: any) {
    // Process incoming orders from Shopify/WooCommerce
    return { status: 'received' };
  }
}
