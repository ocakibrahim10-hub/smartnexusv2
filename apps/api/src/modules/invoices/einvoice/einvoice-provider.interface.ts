export type EInvoiceSendResult = {
  eInvoiceId: string;
  eStatus: 'SENT' | 'PENDING';
  providerRef?: string;
  ublUuid?: string;
};

export type EInvoicePayload = {
  id: string;
  code: string;
  type: string;
  total: number;
  vatTotal: number;
  contact: { name: string; taxNo?: string | null; email?: string | null };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
};

export interface EInvoiceProvider {
  readonly name: string;
  send(invoice: EInvoicePayload): Promise<EInvoiceSendResult>;
  cancel(eInvoiceId: string): Promise<void>;
}
