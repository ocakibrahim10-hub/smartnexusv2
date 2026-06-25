import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EInvoiceProvider } from './einvoice-provider.interface';
import { MockEInvoiceProvider } from './mock-einvoice.provider';
import { UyumsoftEInvoiceProvider } from '../../integrations/einvoice/uyumsoft-einvoice.provider';

@Injectable()
export class EInvoiceProviderFactory {
  constructor(
    private config: ConfigService,
    private mock: MockEInvoiceProvider,
    private uyumsoft: UyumsoftEInvoiceProvider,
  ) {}

  getProvider(): EInvoiceProvider {
    const provider = (this.config.get<string>('EINVOICE_PROVIDER') || 'mock').toLowerCase();
    if (provider === 'uyumsoft' || provider === 'foriba' || provider === 'logo') {
      return this.uyumsoft;
    }
    return this.mock;
  }
}
