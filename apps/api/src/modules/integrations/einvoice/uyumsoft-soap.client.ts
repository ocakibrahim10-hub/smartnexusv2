import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const NS = 'http://tempuri.org/';

@Injectable()
export class UyumsoftSoapClient {
  private readonly logger = new Logger(UyumsoftSoapClient.name);

  constructor(private config: ConfigService) {}

  get endpoint() {
    return (
      this.config.get<string>('UYUMSOFT_API_URL') ||
      'https://efatura-test.uyumsoft.com.tr/services/BasicIntegration'
    );
  }

  private credentials() {
    const username = this.config.get<string>('UYUMSOFT_USERNAME');
    const password = this.config.get<string>('UYUMSOFT_PASSWORD');
    if (!username || !password) {
      throw new BadRequestException('UYUMSOFT_USERNAME ve UYUMSOFT_PASSWORD gerekli');
    }
    return { username, password };
  }

  private envelope(action: string, body: string) {
    const { username, password } = this.credentials();
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="${NS}">
  <soap:Header>
    <wsse:Security soap:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${this.xmlEsc(username)}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${this.xmlEsc(password)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;
  }

  private xmlEsc(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async call(action: string, innerBody: string): Promise<string> {
    const xml = this.envelope(action, innerBody);
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `${NS}IIntegration/${action}`,
      },
      body: xml,
    });

    const text = await res.text();
    if (!res.ok) {
      this.logger.error(`Uyumsoft SOAP ${action} HTTP ${res.status}: ${text.slice(0, 500)}`);
      throw new BadRequestException(`Uyumsoft API hatası (HTTP ${res.status})`);
    }

    if (text.includes('IsSucceded>false') || text.includes('<IsSucceded>false</IsSucceded>')) {
      const msg = this.extractTag(text, 'Message') || 'Uyumsoft işlem başarısız';
      throw new BadRequestException(msg);
    }

    return text;
  }

  private extractTag(xml: string, tag: string): string | null {
    const m = xml.match(new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}[^>]*>([^<]*)</`, 'i'));
    return m?.[1]?.trim() || null;
  }

  async sendInvoice(ublXml: string, localDocumentId: string): Promise<{ uuid: string; ref: string }> {
    const b64 = Buffer.from(ublXml, 'utf-8').toString('base64');
    const body = `
    <tem:SendInvoice>
      <tem:invoices>
        <tem:InvoiceInfo>
          <tem:LocalDocumentId>${this.xmlEsc(localDocumentId)}</tem:LocalDocumentId>
          <tem:Invoice>${b64}</tem:Invoice>
        </tem:InvoiceInfo>
      </tem:invoices>
    </tem:SendInvoice>`;

    const response = await this.call('SendInvoice', body);
    const uuid =
      this.extractTag(response, 'InvoiceId') ||
      this.extractTag(response, 'UUID') ||
      localDocumentId;
    return { uuid, ref: `UYM-${uuid}` };
  }

  async cancelInvoice(invoiceId: string): Promise<void> {
    const body = `
    <tem:CancelInvoice>
      <tem:invoiceId>${this.xmlEsc(invoiceId)}</tem:invoiceId>
    </tem:CancelInvoice>`;
    await this.call('CancelInvoice', body);
  }

  async getInvoiceStatus(invoiceId: string): Promise<string> {
    const body = `
    <tem:GetOutboxInvoiceStatus>
      <tem:invoiceIds>
        <tem:string>${this.xmlEsc(invoiceId)}</tem:string>
      </tem:invoiceIds>
    </tem:GetOutboxInvoiceStatus>`;
    const response = await this.call('GetOutboxInvoiceStatus', body);
    return this.extractTag(response, 'Status') || 'PENDING';
  }

  /** Gelen e-fatura listesi */
  async getInboxInvoices(startDate: string, endDate: string): Promise<Array<{ id: string; number: string; date: string; senderVkn: string; senderName: string }>> {
    const body = `
    <tem:GetInboxInvoices>
      <tem:startDate>${this.xmlEsc(startDate)}</tem:startDate>
      <tem:endDate>${this.xmlEsc(endDate)}</tem:endDate>
    </tem:GetInboxInvoices>`;
    const response = await this.call('GetInboxInvoices', body);
    const ids = [...response.matchAll(/<(?:[a-zA-Z0-9]+:)?InvoiceId[^>]*>([^<]+)</gi)].map((m) => m[1].trim());
    return ids.map((id, i) => ({
      id,
      number: this.extractTag(response, 'InvoiceNumber') || id,
      date: this.extractTag(response, 'ExecutionDate') || startDate,
      senderVkn: this.extractTag(response, 'SenderVkn') || '',
      senderName: this.extractTag(response, 'SenderName') || `Gönderen ${i + 1}`,
    }));
  }

  /** Gelen e-fatura UBL içeriği (base64) */
  async getInboxInvoiceData(invoiceId: string): Promise<string> {
    const body = `
    <tem:GetInboxInvoiceData>
      <tem:invoiceId>${this.xmlEsc(invoiceId)}</tem:invoiceId>
    </tem:GetInboxInvoiceData>`;
    const response = await this.call('GetInboxInvoiceData', body);
    const b64 = this.extractTag(response, 'Data') || this.extractTag(response, 'Invoice');
    if (!b64) throw new BadRequestException('E-fatura içeriği alınamadı');
    return Buffer.from(b64, 'base64').toString('utf-8');
  }

  /** E-irsaliye gönder */
  async sendDespatch(ublXml: string, localDocumentId: string): Promise<{ uuid: string; ref: string }> {
    const b64 = Buffer.from(ublXml, 'utf-8').toString('base64');
    const body = `
    <tem:SendDespatchAdvice>
      <tem:despatchAdvices>
        <tem:DespatchAdviceInfo>
          <tem:LocalDocumentId>${this.xmlEsc(localDocumentId)}</tem:LocalDocumentId>
          <tem:DespatchAdvice>${b64}</tem:DespatchAdvice>
        </tem:DespatchAdviceInfo>
      </tem:despatchAdvices>
    </tem:SendDespatchAdvice>`;
    const response = await this.call('SendDespatchAdvice', body);
    const uuid =
      this.extractTag(response, 'DespatchAdviceId') ||
      this.extractTag(response, 'UUID') ||
      localDocumentId;
    return { uuid, ref: `UYM-IR-${uuid}` };
  }
}
