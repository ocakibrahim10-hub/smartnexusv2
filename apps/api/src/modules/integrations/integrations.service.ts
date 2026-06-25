import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenBankingService } from './open-banking/open-banking.service';
import { PaymentService } from './payments/payment.service';
import { EmailService } from './notifications/email.service';
import { SmsService } from './notifications/sms.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private openBanking: OpenBankingService,
    private payments: PaymentService,
    private email: EmailService,
    private sms: SmsService,
  ) {}

  getStatus(tenantId: string) {
    const einvoiceProvider = this.config.get('EINVOICE_PROVIDER') || 'mock';
    return {
      einvoice: {
        provider: einvoiceProvider,
        configured:
          einvoiceProvider === 'mock' ||
          !!(
            this.config.get('UYUMSOFT_USERNAME') &&
            this.config.get('UYUMSOFT_PASSWORD') &&
            this.config.get('UYUMSOFT_VKN')
          ),
      },
      openBanking: {
        configured: !!(this.config.get('OPEN_BANKING_CLIENT_ID') && this.config.get('OPEN_BANKING_CLIENT_SECRET')),
        banks: ['ZIRAAT', 'ISBANK', 'GARANTI', 'AKBANK', 'YAPIKREDI'],
      },
      payments: this.payments.listProviders(),
      activeProvider: this.config.get('PAYMENT_PROVIDER') || 'iyzico',
      email: { provider: 'resend', configured: this.email.isConfigured() },
      sms: { provider: 'netgsm', configured: this.sms.isConfigured() },
    };
  }

  async listTenantIntegrations(tenantId: string) {
    return this.prisma.tenantIntegration.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  openBankingAuth(tenantId: string, bankCode: string, bankAccountId?: string) {
    return this.openBanking.getAuthorizationUrl(tenantId, bankCode, bankAccountId);
  }

  openBankingCallback(tenantId: string, code: string, state: string) {
    return this.openBanking.handleCallback(tenantId, code, state);
  }

  async testEmail(to: string) {
    return this.email.send(to, 'SmartNexus Test', '<p>Entegrasyon test e-postası başarılı.</p>');
  }

  async testSms(phone: string) {
    return this.sms.send(phone, 'SmartNexus entegrasyon test SMS');
  }

  async emailInvoice(tenantId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { contact: { select: { name: true, email: true } } },
    });
    if (!inv) throw new NotFoundException('Fatura bulunamadı');
    if (!inv.contact.email) throw new BadRequestException('Cari e-posta adresi yok');
    await this.email.sendInvoiceNotification(
      inv.contact.email,
      `${inv.series}-${inv.number}`,
      inv.total,
    );
    return { sent: true, to: inv.contact.email };
  }
}
