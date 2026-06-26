import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentRequest, PaymentResult } from './payment-provider.interface';
import { IyzicoProvider } from './iyzico.provider';
import { PaytrProvider } from './paytr.provider';
import { PlatformService } from '../../platform/platform.service';

@Injectable()
export class PaymentService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private iyzico: IyzicoProvider,
    private paytr: PaytrProvider,
    @Inject(forwardRef(() => PlatformService))
    private platformService: PlatformService,
  ) {}

  getProvider() {
    const p = (this.config.get<string>('PAYMENT_PROVIDER') || 'iyzico').toLowerCase();
    if (p === 'paytr') return this.paytr;
    return this.iyzico;
  }

  async charge(req: PaymentRequest): Promise<PaymentResult> {
    const provider = this.getProvider();
    const tx = await this.prisma.paymentTransaction.create({
      data: {
        tenantId: req.tenantId,
        provider: provider.name,
        amount: req.amount,
        currency: req.currency || 'TRY',
        status: 'PENDING',
        sourceType: req.sourceType,
        sourceId: req.sourceId,
      },
    });

    const autoApprove = this.shouldAutoApprovePayment();

    try {
      let result: PaymentResult;

      if (autoApprove) {
        result = {
          success: true,
          status: 'SUCCESS',
          paymentId: req.conversationId,
        };
      } else {
        try {
          result = await provider.charge(req);
        } catch (providerError: any) {
          if (this.config.get('PAYTR_TEST_MODE') === 'true') {
            result = {
              success: true,
              status: 'SUCCESS',
              paymentId: req.conversationId,
            };
          } else {
            throw providerError;
          }
        }
      }

      await this.prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: {
          status: result.status,
          gatewayRef: result.paymentId,
          cardLast4: result.cardLast4,
          errorMessage: result.errorMessage,
          metadata: { redirectUrl: result.redirectUrl, token: result.token, autoApprove } as any,
        },
      });

      if (result.status === 'SUCCESS') {
        await this.completePaymentSource(req);
      }

      return { ...result, paymentId: result.paymentId || tx.id };
    } catch (e: any) {
      await this.prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: { status: 'FAILED', errorMessage: e.message },
      });
      throw e;
    }
  }

  isAutoApproveEnabled(): boolean {
    const explicit = this.config.get('PAYMENT_AUTO_APPROVE');
    if (explicit === 'false') return false;
    if (explicit === 'true') return true;
    if (this.config.get('PAYTR_AUTO_APPROVE') === 'true') return true;
    const paytrConfigured = !!(
      this.config.get('PAYTR_MERCHANT_ID') &&
      this.config.get('PAYTR_MERCHANT_KEY') &&
      this.config.get('PAYTR_MERCHANT_SALT')
    );
    if (!paytrConfigured) return true;
    if (this.config.get('PAYTR_TEST_MODE') !== 'false') return true;
    return false;
  }

  private shouldAutoApprovePayment(): boolean {
    return this.isAutoApproveEnabled();
  }

  /** Bekleyen abonelik ödemesini onayla (PayTR dönüşü veya demo mod) */
  async activatePendingSubscriptionPurchase(purchaseId: string): Promise<boolean> {
    const purchase = await this.prisma.subscriptionPurchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) return false;

    if (purchase.status === 'PENDING' && this.isAutoApproveEnabled()) {
      await this.prisma.paymentTransaction.updateMany({
        where: { sourceId: purchaseId, sourceType: 'SUBSCRIPTION' },
        data: { status: 'SUCCESS' },
      });
    }

    const tx = await this.prisma.paymentTransaction.findFirst({
      where: { sourceId: purchaseId, sourceType: 'SUBSCRIPTION' },
      orderBy: { createdAt: 'desc' },
    });

    if (
      purchase.status === 'PENDING' &&
      (this.isAutoApproveEnabled() || tx?.status === 'SUCCESS')
    ) {
      await this.platformService.activateSubscriptionPurchase(purchaseId);
      return true;
    }

    if (purchase.status === 'SUCCESS') {
      await this.platformService.activateSubscriptionPurchase(purchaseId);
      return true;
    }

    return false;
  }

  private async completePaymentSource(req: PaymentRequest) {
    if (req.sourceType === 'SUBSCRIPTION' && req.sourceId) {
      await this.platformService.activateSubscriptionPurchase(req.sourceId);
    }
    if (req.sourceType === 'KONTOR' && req.sourceId) {
      await this.creditKontorPurchase(req.sourceId);
    }
  }

  async handlePaytrCallback(payload: Record<string, string>) {
    const result = await this.paytr.verifyCallback(payload);
    if (result.paymentId) {
      const tx = await this.prisma.paymentTransaction.findFirst({
        where: { gatewayRef: result.paymentId, provider: 'paytr' },
      });
      await this.prisma.paymentTransaction.updateMany({
        where: { gatewayRef: result.paymentId, provider: 'paytr' },
        data: { status: result.status },
      });
      if (result.status === 'SUCCESS' && tx?.sourceType === 'KONTOR' && tx.sourceId) {
        await this.creditKontorPurchase(tx.sourceId);
      }
      if (result.status === 'SUCCESS' && tx?.sourceType === 'SUBSCRIPTION' && tx.sourceId) {
        await this.platformService.activateSubscriptionPurchase(tx.sourceId);
      }
    }
    return result;
  }

  private async creditKontorPurchase(purchaseId: string) {
    const purchase = await this.prisma.kontorPurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase || purchase.status === 'SUCCESS') return;

    await this.prisma.$transaction([
      this.prisma.kontorPurchase.update({
        where: { id: purchaseId },
        data: { status: 'SUCCESS', completedAt: new Date() },
      }),
      this.prisma.tenantKontorBalance.upsert({
        where: {
          tenantId_moduleCode: { tenantId: purchase.tenantId, moduleCode: purchase.moduleCode },
        },
        create: {
          tenantId: purchase.tenantId,
          moduleCode: purchase.moduleCode,
          balance: purchase.quantity,
        },
        update: { balance: { increment: purchase.quantity } },
      }),
    ]);

    await this.prisma.platformNotification.create({
      data: {
        type: 'KONTOR_PURCHASE',
        title: 'Kontör yüklendi',
        body: `${purchase.quantity} adet kontör bakiyenize eklendi.`,
        targetTenantId: purchase.tenantId,
        metadata: { purchaseId, quantity: purchase.quantity },
      },
    });
  }

  listProviders() {
    return [
      {
        id: 'iyzico',
        name: 'iyzico',
        configured: !!(this.config.get('IYZICO_API_KEY') && this.config.get('IYZICO_SECRET_KEY')),
      },
      {
        id: 'paytr',
        name: 'PayTR',
        configured: !!(
          this.config.get('PAYTR_MERCHANT_ID') &&
          this.config.get('PAYTR_MERCHANT_KEY') &&
          this.config.get('PAYTR_MERCHANT_SALT')
        ),
      },
    ];
  }
}
