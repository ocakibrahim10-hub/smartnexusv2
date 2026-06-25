export type ParsedUblInvoice = {
  uuid: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  supplierName: string | null;
  supplierTaxNo: string | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    unit?: string;
  }>;
  subtotal: number;
  vatTotal: number;
  total: number;
};

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<(?:[a-zA-Z0-9]+:)?${name}[^>]*>([^<]*)</`, 'i'));
  return m?.[1]?.trim() || null;
}

function tags(xml: string, name: string): string[] {
  const re = new RegExp(`<(?:[a-zA-Z0-9]+:)?${name}[^>]*>([^<]*)</`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

function num(v: string | null | undefined, fallback = 0) {
  const n = parseFloat(String(v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Gelen UBL-TR fatura XML'inden alış satırları çıkarır */
export function parseUblInvoiceXml(xml: string): ParsedUblInvoice {
  const uuid = tag(xml, 'UUID');
  const invoiceNumber = tag(xml, 'ID');
  const issueDate = tag(xml, 'IssueDate');
  const supplierName =
    tag(xml, 'RegistrationName') ||
    tag(xml, 'Name') ||
    null;
  const supplierTaxNo =
    tags(xml, 'ID').find((v) => /^\d{10,11}$/.test(v)) ||
    tag(xml, 'CompanyID') ||
    null;

  const lineBlocks = xml.match(
    /<(?:[a-zA-Z0-9]+:)?InvoiceLine[\s\S]*?<\/(?:[a-zA-Z0-9]+:)?InvoiceLine>/gi,
  ) || [];

  const lines = lineBlocks.map((block) => {
    const qty = num(tag(block, 'InvoicedQuantity'), 1);
    const lineNet = num(tag(block, 'LineExtensionAmount'));
    const unitPrice = qty > 0 ? lineNet / qty : lineNet;
    const vatRate = num(tag(block, 'Percent'), 20);
    const description = tag(block, 'Name') || tag(block, 'Description') || 'Kalem';
    return {
      description,
      quantity: qty,
      unitPrice,
      vatRate,
      unit: 'ADET',
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vatTotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const total = num(tag(xml, 'TaxInclusiveAmount')) || subtotal + vatTotal;

  return {
    uuid,
    invoiceNumber,
    issueDate,
    supplierName,
    supplierTaxNo,
    lines,
    subtotal,
    vatTotal,
    total,
  };
}
