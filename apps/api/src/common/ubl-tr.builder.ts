import { randomUUID } from 'crypto';

export type UblInvoiceInput = {
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

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number) {
  return n.toFixed(2);
}

/** UBL-TR 1.2.1 fatura XML üretici (GİB uyumlu temel şablon) */
export function buildUblTrInvoice(
  invoice: UblInvoiceInput,
  supplier: { vkn: string; name: string; taxOffice?: string },
): { uuid: string; xml: string } {
  const uuid = randomUUID();
  const issueDate = new Date().toISOString().split('T')[0];
  const issueTime = new Date().toTimeString().split(' ')[0];
  const profileId = invoice.total >= 9900 ? 'TICARIFATURA' : 'EARSIVFATURA';

  const linesXml = invoice.lines
    .map((line, i) => {
      const lineNet = line.quantity * line.unitPrice;
      const lineVat = lineNet * (line.vatRate / 100);
      return `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="TRY">${fmt(lineNet)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="TRY">${fmt(lineVat)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="TRY">${fmt(lineNet)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="TRY">${fmt(lineVat)}</cbc:TaxAmount>
          <cbc:Percent>${line.vatRate}</cbc:Percent>
          <cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item><cbc:Name>${esc(line.description)}</cbc:Name></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="TRY">${fmt(line.unitPrice)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${profileId}</cbc:ProfileID>
  <cbc:ID>${esc(invoice.code)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${esc(supplier.vkn)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${esc(supplier.name)}</cbc:Name></cac:PartyName>
      ${supplier.taxOffice ? `<cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${esc(supplier.taxOffice)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${esc(invoice.contact.taxNo || '1111111111')}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${esc(invoice.contact.name)}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${fmt(invoice.vatTotal)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${fmt(invoice.total - invoice.vatTotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${fmt(invoice.total - invoice.vatTotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${fmt(invoice.total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="TRY">${fmt(invoice.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;

  return { uuid, xml };
}
