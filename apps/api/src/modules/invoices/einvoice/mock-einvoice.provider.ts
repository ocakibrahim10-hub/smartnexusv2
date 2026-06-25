import { Injectable } from '@nestjs/common';
import {
  EInvoicePayload,
  EInvoiceProvider,
  EInvoiceSendResult,
} from './einvoice-provider.interface';

/** Geliştirme / demo — gerçek GİB gönderimi yapmaz */
@Injectable()
export class MockEInvoiceProvider implements EInvoiceProvider {
  readonly name = 'mock';

  async send(invoice: EInvoicePayload): Promise<EInvoiceSendResult> {
    const eInvoiceId = `GIB-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    return { eInvoiceId, eStatus: 'SENT', providerRef: `MOCK-${invoice.code}` };
  }

  async cancel(_eInvoiceId: string): Promise<void> {
    return;
  }
}
