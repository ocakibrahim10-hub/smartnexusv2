import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  isConfigured() {
    return !!(
      this.config.get('NETGSM_USERCODE') &&
      this.config.get('NETGSM_PASSWORD') &&
      this.config.get('NETGSM_HEADER')
    );
  }

  async send(phone: string, message: string) {
    const usercode = this.config.get<string>('NETGSM_USERCODE');
    const password = this.config.get<string>('NETGSM_PASSWORD');
    const header = this.config.get<string>('NETGSM_HEADER');
    if (!usercode || !password || !header) {
      throw new BadRequestException('NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_HEADER gerekli');
    }

    const gsm = phone.replace(/\D/g, '').replace(/^0/, '90');
    const params = new URLSearchParams({
      usercode,
      password,
      gsmno: gsm,
      message,
      msgheader: header,
      dil: 'TR',
    });

    const res = await fetch(`https://api.netgsm.com.tr/sms/send/get?${params}`);
    const text = await res.text();
    if (!res.ok || text.startsWith('00') === false) {
      this.logger.warn(`Netgsm response: ${text}`);
      if (text.includes('20') || text.includes('30') || text.includes('40')) {
        throw new BadRequestException(`SMS gönderilemedi: ${text}`);
      }
    }
    return { success: true, providerRef: text.trim() };
  }
}
