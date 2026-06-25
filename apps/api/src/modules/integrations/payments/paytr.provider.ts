import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
} from './payment-provider.interface';

@Injectable()
export class PaytrProvider implements PaymentProvider {
  readonly name = 'paytr';

  constructor(private config: ConfigService) {}

  private merchant() {
    const merchantId = this.config.get<string>('PAYTR_MERCHANT_ID');
    const merchantKey = this.config.get<string>('PAYTR_MERCHANT_KEY');
    const merchantSalt = this.config.get<string>('PAYTR_MERCHANT_SALT');
    if (!merchantId || !merchantKey || !merchantSalt) {
      throw new BadRequestException('PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT gerekli');
    }
    return { merchantId, merchantKey, merchantSalt };
  }

  async charge(req: PaymentRequest): Promise<PaymentResult> {
    const { merchantId, merchantKey, merchantSalt } = this.merchant();
    const amountKurus = Math.round(req.amount * 100);
    const userBasket = Buffer.from(
      JSON.stringify(req.basketItems.map((b) => [b.name, b.price.toFixed(2), 1])),
    ).toString('base64');

    const hashStr = `${merchantId}${req.buyer.ip || '127.0.0.1'}${req.conversationId}${req.buyer.email}${amountKurus}${userBasket}0TL${merchantSalt}`;
    const paytrToken = createHmac('sha256', merchantKey).update(hashStr).digest('base64');

    const form = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: req.buyer.ip || '127.0.0.1',
      merchant_oid: req.conversationId,
      email: req.buyer.email,
      payment_amount: String(amountKurus),
      paytr_token: paytrToken,
      user_basket: userBasket,
      no_installment: '1',
      max_installment: '0',
      currency: 'TL',
      test_mode: this.config.get('PAYTR_TEST_MODE') === 'true' ? '1' : '0',
      merchant_ok_url: req.callbackUrl || `${this.config.get('FRONTEND_URL')}/pos?payment=ok`,
      merchant_fail_url: req.callbackUrl || `${this.config.get('FRONTEND_URL')}/pos?payment=fail`,
      user_name: `${req.buyer.name} ${req.buyer.surname}`,
      user_address: 'Türkiye',
      user_phone: req.buyer.phone || '05000000000',
    });

    const res = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    const data = (await res.json()) as { status?: string; token?: string; reason?: string };

    if (data.status !== 'success' || !data.token) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: data.reason || 'PayTR token alınamadı',
      };
    }

    return {
      success: true,
      status: 'PENDING',
      token: data.token,
      redirectUrl: `https://www.paytr.com/odeme/guvenli/${data.token}`,
      paymentId: req.conversationId,
    };
  }

  async verifyCallback(payload: Record<string, string>): Promise<PaymentResult> {
    const { merchantKey, merchantSalt } = this.merchant();
    const hash = createHmac('sha256', merchantKey)
      .update(`${payload.merchant_oid}${merchantSalt}${payload.status}${payload.total_amount}`)
      .digest('base64');

    if (hash !== payload.hash) {
      return { success: false, status: 'FAILED', errorMessage: 'PayTR imza doğrulaması başarısız' };
    }

    const success = payload.status === 'success';
    return {
      success,
      paymentId: payload.merchant_oid,
      status: success ? 'SUCCESS' : 'FAILED',
    };
  }
}
