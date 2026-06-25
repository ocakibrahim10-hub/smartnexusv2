import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EInvoicePayload,
  EInvoiceProvider,
  EInvoiceSendResult,
} from '../../invoices/einvoice/einvoice-provider.interface';
import { buildUblTrInvoice } from '../../../common/ubl-tr.builder';
import { UyumsoftSoapClient } from './uyumsoft-soap.client';

@Injectable()
export class UyumsoftEInvoiceProvider implements EInvoiceProvider {
  readonly name = 'uyumsoft';

  constructor(
    private config: ConfigService,
    private soap: UyumsoftSoapClient,
  ) {}

  private supplier() {
    const vkn = this.config.get<string>('UYUMSOFT_VKN');
    const name = this.config.get<string>('UYUMSOFT_SUPPLIER_NAME') || 'SmartNexus Demo';
    const taxOffice = this.config.get<string>('UYUMSOFT_TAX_OFFICE');
    if (!vkn) throw new BadRequestException('UYUMSOFT_VKN yapılandırması gerekli');
    return { vkn, name, taxOffice };
  }

  async send(invoice: EInvoicePayload): Promise<EInvoiceSendResult> {
    const { uuid, xml } = buildUblTrInvoice(invoice, this.supplier());
    const result = await this.soap.sendInvoice(xml, invoice.id);

    let eStatus: 'SENT' | 'PENDING' = 'PENDING';
    try {
      const status = await this.soap.getInvoiceStatus(result.uuid);
      if (status === 'Approved' || status === '1000') eStatus = 'SENT';
    } catch {
      eStatus = 'PENDING';
    }

    return {
      eInvoiceId: result.uuid,
      eStatus,
      providerRef: result.ref,
      ublUuid: uuid,
    };
  }

  async cancel(eInvoiceId: string): Promise<void> {
    await this.soap.cancelInvoice(eInvoiceId);
  }
}
