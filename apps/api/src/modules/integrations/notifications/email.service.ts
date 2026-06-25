import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  private get apiKey() {
    return this.config.get<string>('RESEND_API_KEY');
  }

  private get fromEmail() {
    return this.config.get<string>('RESEND_FROM_EMAIL') || 'noreply@smartnexus.local';
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async send(to: string, subject: string, html: string) {
    if (!this.apiKey) {
      throw new BadRequestException('RESEND_API_KEY yapılandırması gerekli');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: this.fromEmail, to: [to], subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Resend error: ${err}`);
      throw new BadRequestException('E-posta gönderilemedi');
    }

    return res.json();
  }

  async sendInvoiceNotification(to: string, invoiceCode: string, total: number) {
    return this.send(
      to,
      `Fatura: ${invoiceCode}`,
      `<p>Sayın müşterimiz,</p><p><strong>${invoiceCode}</strong> numaralı faturanız oluşturuldu.</p><p>Toplam: <strong>${total.toLocaleString('tr-TR')} ₺</strong></p><p>SmartNexus ERP</p>`,
    );
  }
}
