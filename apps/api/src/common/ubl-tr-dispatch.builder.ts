import { randomUUID } from 'crypto';

export type DespatchInput = {
  code: string;
  issueDate?: string;
  supplier: { vkn: string; name: string };
  customer: { name: string; taxNo?: string | null; address?: string | null };
  driver: { name: string; nationalId?: string | null; phone?: string | null };
  vehiclePlate?: string | null;
  lines: Array<{ description: string; quantity: number; unit?: string }>;
};

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** UBL-TR DespatchAdvice (e-irsaliye) temel şablon */
export function buildUblTrDespatch(input: DespatchInput): { uuid: string; xml: string } {
  const uuid = randomUUID();
  const issueDate = input.issueDate || new Date().toISOString().split('T')[0];

  const linesXml = input.lines
    .map((line, i) => {
      return `
    <cac:DespatchLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:DeliveredQuantity unitCode="C62">${line.quantity}</cbc:DeliveredQuantity>
      <cac:OrderLineReference><cbc:LineID>${i + 1}</cbc:LineID></cac:OrderLineReference>
      <cac:Item><cbc:Name>${esc(line.description)}</cbc:Name></cac:Item>
    </cac:DespatchLine>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>TEMELIRSALIYE</cbc:ProfileID>
  <cbc:ID>${esc(input.code)}</cbc:ID>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DespatchAdviceTypeCode>SEVK</cbc:DespatchAdviceTypeCode>
  <cac:DespatchSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="VKN">${esc(input.supplier.vkn)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${esc(input.supplier.name)}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:DespatchSupplierParty>
  <cac:DeliveryCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${esc(input.customer.name)}</cbc:Name></cac:PartyName>
      ${input.customer.address ? `<cac:PostalAddress><cbc:StreetName>${esc(input.customer.address)}</cbc:StreetName></cac:PostalAddress>` : ''}
    </cac:Party>
  </cac:DeliveryCustomerParty>
  <cac:Shipment>
    <cbc:ID>1</cbc:ID>
    ${input.vehiclePlate ? `<cac:TransportHandlingUnit><cac:TransportEquipment><cbc:ID>${esc(input.vehiclePlate)}</cbc:ID></cac:TransportEquipment></cac:TransportHandlingUnit>` : ''}
    <cac:DriverPerson>
      <cbc:FirstName>${esc(input.driver.name.split(' ')[0] || input.driver.name)}</cbc:FirstName>
      <cbc:FamilyName>${esc(input.driver.name.split(' ').slice(1).join(' ') || '-')}</cbc:FamilyName>
      ${input.driver.nationalId ? `<cbc:NationalityID>${esc(input.driver.nationalId)}</cbc:NationalityID>` : ''}
    </cac:DriverPerson>
  </cac:Shipment>
  ${linesXml}
</DespatchAdvice>`;

  return { uuid, xml };
}
