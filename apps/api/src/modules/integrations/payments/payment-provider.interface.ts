export type PaymentRequest = {
  tenantId: string;
  amount: number;
  currency?: string;
  conversationId: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone?: string;
    identityNumber?: string;
    ip?: string;
  };
  card?: {
    holderName: string;
    number: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
  };
  basketItems: Array<{ id: string; name: string; price: number; category?: string }>;
  sourceType?: string;
  sourceId?: string;
  callbackUrl?: string;
};

export type PaymentResult = {
  success: boolean;
  paymentId?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  redirectUrl?: string;
  token?: string;
  errorMessage?: string;
  cardLast4?: string;
};

export interface PaymentProvider {
  readonly name: string;
  charge(req: PaymentRequest): Promise<PaymentResult>;
  verifyCallback?(payload: Record<string, string>): Promise<PaymentResult>;
}
