import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { MockEInvoiceProvider } from './einvoice/mock-einvoice.provider';
import { EInvoiceProviderFactory } from './einvoice/einvoice-provider.factory';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, MockEInvoiceProvider, EInvoiceProviderFactory],
  exports: [InvoicesService],
})
export class InvoicesModule {}
