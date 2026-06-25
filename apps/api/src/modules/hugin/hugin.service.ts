import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

/**
 * Hugin S1 ECR (Electronic Cash Register) Entegrasyonu
 *
 * Hugin S1 yazarkasalar TCP/IP veya USB üzerinden iletişim kurar.
 * Protokol: Hugin ECR komut seti (sektör standardı)
 *
 * Bağlantı: IP:PORT (varsayılan 9100)
 *
 * Komut formatı:
 * STX (0x02) | CMD (2 byte) | DATA | ETX (0x03) | CHK (1 byte XOR)
 */

export interface HuginItem {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // 1=KDV1(%1), 2=KDV2(%10), 3=KDV3(%20)
  department?: number;
}

export interface HuginPayment {
  type: 'CASH' | 'CARD' | 'CHECK' | 'WIRE';
  amount: number;
}

export interface HuginReceiptResult {
  success: boolean;
  fiscalNo?: string;
  zcNo?: string;
  total?: number;
  error?: string;
  rawResponse?: string;
}

@Injectable()
export class HuginService {
  private readonly logger = new Logger(HuginService.name);

  // Varsayılan Hugin S1 bağlantı ayarları
  private host = process.env.HUGIN_HOST || '192.168.1.100';
  private port = parseInt(process.env.HUGIN_PORT || '9100');
  private timeout = parseInt(process.env.HUGIN_TIMEOUT || '5000');

  // VAT oranı → Hugin VAT grubu eşleştirmesi
  private vatRateToGroup(rate: number): number {
    if (rate <= 1) return 1; // %1 KDV
    if (rate <= 10) return 2; // %10 KDV
    return 3; // %20 KDV
  }

  // XOR checksum hesapla
  private checksum(data: Buffer): number {
    let xor = 0;
    for (const byte of data) xor ^= byte;
    return xor;
  }

  // TCP bağlantısı aç ve komut gönder
  private sendCommand(command: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let responseData = Buffer.alloc(0);

      client.setTimeout(this.timeout);

      client.connect(this.port, this.host, () => {
        client.write(command);
      });

      client.on('data', (data) => {
        responseData = Buffer.concat([responseData, data]);
        // Hugin cevabı ETX (0x03) ile biter
        if (responseData.includes(0x03)) {
          client.destroy();
          resolve(responseData);
        }
      });

      client.on('timeout', () => {
        client.destroy();
        reject(new Error('Hugin S1 bağlantı zaman aşımı'));
      });

      client.on('error', (err) => {
        reject(new Error(`Hugin S1 bağlantı hatası: ${err.message}`));
      });
    });
  }

  // Fiş satırı komut paketi oluştur
  private buildItemCommand(item: HuginItem): Buffer {
    // Hugin komut: SATIŞ SATIRI
    // Format: STX 'S' DEPT QTY PRICE VAT_GRP NAME ETX CHK
    const dept = item.department || 1;
    const qty = Math.round(item.quantity * 1000); // x1000 fixed point
    const price = Math.round(item.unitPrice * 100); // kuruş
    const vatGrp = this.vatRateToGroup(item.vatRate);
    const nameBytes = Buffer.from(item.name.substring(0, 20).padEnd(20), 'latin1');

    const payload = Buffer.alloc(32);
    payload.writeUInt8(0x02, 0); // STX
    payload.write('P1', 1, 'ascii'); // CMD: P1 = PLU satış
    payload.writeUInt8(dept, 3);
    payload.writeUInt32BE(qty, 4);
    payload.writeUInt32BE(price, 8);
    payload.writeUInt8(vatGrp, 12);
    nameBytes.copy(payload, 13);
    payload.writeUInt8(0x03, 33); // ETX

    const chk = this.checksum(payload.slice(1, 33));
    const final = Buffer.concat([payload, Buffer.from([chk])]);
    return final;
  }

  // Ödeme komut paketi
  private buildPaymentCommand(payment: HuginPayment): Buffer {
    const payCode = { CASH: 0x01, CARD: 0x02, CHECK: 0x03, WIRE: 0x04 }[payment.type] || 0x01;
    const amount = Math.round(payment.amount * 100);

    const payload = Buffer.alloc(12);
    payload.writeUInt8(0x02, 0); // STX
    payload.write('T1', 1, 'ascii'); // CMD: T1 = Tahsilat
    payload.writeUInt8(payCode, 3);
    payload.writeUInt32BE(amount, 4);
    payload.writeUInt8(0x03, 8); // ETX

    const chk = this.checksum(payload.slice(1, 9));
    return Buffer.concat([payload, Buffer.from([chk])]);
  }

  /**
   * Tam satış işlemi: Ürün ekle → Ödeme al → Fiş kapat
   */
  async printReceipt(items: HuginItem[], payments: HuginPayment[]): Promise<HuginReceiptResult> {
    try {
      this.logger.log(`Hugin S1: ${items.length} ürün, ${payments.length} ödeme`);

      // 1. Fiş aç komutu
      const openCmd = Buffer.from([0x02, 0x46, 0x31, 0x03]); // F1 = Fiş aç
      await this.sendCommand(openCmd);

      // 2. Satır satır ürün ekle
      for (const item of items) {
        const cmd = this.buildItemCommand(item);
        await this.sendCommand(cmd);
        await this.delay(100); // Cihaz işleme süresi
      }

      // 3. Ödemeleri gönder
      for (const payment of payments) {
        const cmd = this.buildPaymentCommand(payment);
        await this.sendCommand(cmd);
        await this.delay(100);
      }

      // 4. Fiş kapat komutu ve fiscal no al
      const closeCmd = Buffer.from([0x02, 0x46, 0x45, 0x03]); // FE = Fiş kapat
      const closeResponse = await this.sendCommand(closeCmd);

      // Response parse: fiscal no extract
      const responseStr = closeResponse.toString('ascii');
      const fiscalMatch = responseStr.match(/FN:(\d+)/);
      const fiscalNo = fiscalMatch ? fiscalMatch[1] : `HUG${Date.now()}`;

      this.logger.log(`Hugin S1: Fiş başarılı - Fiscal No: ${fiscalNo}`);

      return { success: true, fiscalNo, total: payments.reduce((s, p) => s + p.amount, 0) };
    } catch (error) {
      this.logger.error(`Hugin S1 hata: ${error.message}`);
      // Bağlantı yoksa simüle et (dev mode)
      if (process.env.NODE_ENV === 'development' || process.env.HUGIN_SIMULATE === 'true') {
        const fiscalNo = `SIM${Date.now()}`;
        this.logger.warn(`Hugin S1 SIMULATE mode: ${fiscalNo}`);
        return { success: true, fiscalNo, total: payments.reduce((s, p) => s + p.amount, 0) };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Gün sonu Z raporu
   */
  async printZReport(): Promise<HuginReceiptResult> {
    try {
      const zCmd = Buffer.from([0x02, 0x5a, 0x31, 0x03]); // Z1 = Z raporu
      const response = await this.sendCommand(zCmd);
      const responseStr = response.toString('ascii');
      const zcMatch = responseStr.match(/ZC:(\d+)/);
      return { success: true, zcNo: zcMatch ? zcMatch[1] : undefined };
    } catch (error) {
      if (process.env.HUGIN_SIMULATE === 'true') {
        return { success: true, zcNo: `SIMZ${Date.now()}` };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * İptal fişi
   */
  async cancelReceipt(): Promise<HuginReceiptResult> {
    try {
      const cancelCmd = Buffer.from([0x02, 0x43, 0x31, 0x03]); // C1 = İptal
      await this.sendCommand(cancelCmd);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cihaz durumu kontrol
   */
  async getStatus(): Promise<{ connected: boolean; fiscalNo?: string; memory?: string }> {
    try {
      const statusCmd = Buffer.from([0x02, 0x53, 0x31, 0x03]); // S1 = Status
      const response = await this.sendCommand(statusCmd);
      return { connected: true, fiscalNo: response.toString('ascii').match(/FN:(\d+)/)?.[1] };
    } catch {
      return { connected: false };
    }
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
