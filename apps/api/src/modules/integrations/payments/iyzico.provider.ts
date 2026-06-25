import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
} from './payment-provider.interface';

@Injectable()
export class IyzicoProvider implements PaymentProvider {
  readonly name = 'iyzico';

  constructor(private config: ConfigService) {}

  private get baseUrl() {
    return this.config.get('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com';
  }

  private get keys() {
    const apiKey = this.config.get<string>('IYZICO_API_KEY');
    const secretKey = this.config.get<string>('IYZICO_SECRET_KEY');
    if (!apiKey || !secretKey) {
      throw new BadRequestException('IYZICO_API_KEY ve IYZICO_SECRET_KEY gerekli');
    }
    return { apiKey, secretKey };
  }

  private sign(body: string, randomKey: string) {
    const { secretKey } = this.keys;
    const payload = randomKey + body;
    return createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  async charge(req: PaymentRequest): Promise<PaymentResult> {
    if (!req.card) throw new BadRequestException('Kart bilgisi gerekli');

    const { apiKey } = this.keys;
    const price = req.amount.toFixed(2);
    const body = {
      locale: 'tr',
      conversationId: req.conversationId,
      price,
      paidPrice: price,
      currency: req.currency || 'TRY',
      installment: 1,
      paymentChannel: 'WEB',
      basketId: req.conversationId,
      paymentGroup: 'PRODUCT',
      paymentCard: {
        cardHolderName: req.card.holderName,
        cardNumber: req.card.number.replace(/\s/g, ''),
        expireMonth: req.card.expireMonth,
        expireYear: req.card.expireYear,
        cvc: req.card.cvc,
        registerCard: 0,
      },
      buyer: {
        id: req.buyer.id,
        name: req.buyer.name,
        surname: req.buyer.surname,
        email: req.buyer.email,
        gsmNumber: req.buyer.phone || '+905000000000',
        identityNumber: req.buyer.identityNumber || '11111111111',
        registrationAddress: 'Türkiye',
        city: 'Istanbul',
        country: 'Turkey',
        ip: req.buyer.ip || '127.0.0.1',
      },
      shippingAddress: { contactName: `${req.buyer.name} ${req.buyer.surname}`, city: 'Istanbul', country: 'Turkey' },
      billingAddress: { contactName: `${req.buyer.name} ${req.buyer.surname}`, city: 'Istanbul', country: 'Turkey' },
      basketItems: req.basketItems.map((b) => ({
        id: b.id,
        name: b.name,
        category1: b.category || 'Genel',
        itemType: 'PHYSICAL',
        price: b.price.toFixed(2),
      })),
    };

    const bodyStr = JSON.stringify(body);
    const randomKey = Date.now().toString();
    const auth = `IYZWSv2 ${Buffer.from(`${apiKey}:${this.sign(bodyStr, randomKey)}`).toString('base64')}`;

    const res = await fetch(`${this.baseUrl}/payment/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
        'x-iyzi-rnd': randomKey,
      },
      body: bodyStr,
    });

    const data = (await res.json()) as {
      status?: string;
      paymentId?: string;
      errorMessage?: string;
      fraudStatus?: number;
    };

    const success = data.status === 'success';
    return {
      success,
      paymentId: data.paymentId,
      status: success ? 'SUCCESS' : 'FAILED',
      errorMessage: data.errorMessage,
      cardLast4: req.card.number.slice(-4),
    };
  }
}
