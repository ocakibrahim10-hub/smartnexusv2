import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { createHmac, randomBytes } from 'crypto';

export type OpenBankingToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  bankCode: string;
  accountRef?: string;
};

@Injectable()
export class OpenBankingService {
  private readonly logger = new Logger(OpenBankingService.name);
  private pendingStates = new Map<string, { tenantId: string; bankCode: string; bankAccountId?: string }>();

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private get apiBase() {
    return (
      this.config.get<string>('OPEN_BANKING_API_URL') ||
      'https://api.bkm.com.tr/ohvps/sandbox/v1'
    );
  }

  private get clientId() {
    return this.config.get<string>('OPEN_BANKING_CLIENT_ID');
  }

  private get clientSecret() {
    return this.config.get<string>('OPEN_BANKING_CLIENT_SECRET');
  }

  private get redirectUri() {
    return (
      this.config.get<string>('OPEN_BANKING_REDIRECT_URI') ||
      `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/settings?tab=integrations&ob=callback`
    );
  }

  assertConfigured() {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException(
        'Open Banking yapılandırması eksik (OPEN_BANKING_CLIENT_ID, OPEN_BANKING_CLIENT_SECRET)',
      );
    }
  }

  getAuthorizationUrl(tenantId: string, bankCode: string, bankAccountId?: string) {
    this.assertConfigured();
    const state = randomBytes(16).toString('hex');
    this.pendingStates.set(state, { tenantId, bankCode, bankAccountId });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId!,
      redirect_uri: this.redirectUri,
      scope: 'accounts transactions',
      state,
      bank_code: bankCode,
    });

    const authUrl = `${this.apiBase.replace('/v1', '')}/oauth/authorize?${params}`;
    return { authorizationUrl: authUrl, state };
  }

  async handleCallback(tenantId: string, code: string, state: string) {
    this.assertConfigured();
    const pending = this.pendingStates.get(state);
    if (!pending || pending.tenantId !== tenantId) {
      throw new BadRequestException('Geçersiz OAuth state');
    }
    this.pendingStates.delete(state);

    const tokenRes = await fetch(`${this.apiBase}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      this.logger.error(`Open Banking token error: ${err.slice(0, 300)}`);
      throw new BadRequestException('Banka yetkilendirmesi başarısız');
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const token: OpenBankingToken = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : undefined,
      bankCode: pending.bankCode,
    };

    await this.prisma.tenantIntegration.upsert({
      where: {
        tenantId_type_provider: {
          tenantId,
          type: 'OPEN_BANKING',
          provider: pending.bankCode,
        },
      },
      update: {
        config: token as any,
        isActive: true,
        lastError: null,
      },
      create: {
        tenantId,
        type: 'OPEN_BANKING',
        provider: pending.bankCode,
        config: token as any,
      },
    });

    if (pending.bankAccountId) {
      await this.prisma.bankAccount.updateMany({
        where: { id: pending.bankAccountId, tenantId },
        data: { integrationProvider: 'OPEN_BANKING', bankCode: pending.bankCode },
      });
    }

    return { connected: true, bankCode: pending.bankCode };
  }

  async fetchTransactions(
    tenantId: string,
    bankCode: string,
    accountRef: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const integration = await this.prisma.tenantIntegration.findUnique({
      where: {
        tenantId_type_provider: { tenantId, type: 'OPEN_BANKING', provider: bankCode },
      },
    });
    if (!integration?.isActive) {
      throw new BadRequestException('Open Banking bağlantısı bulunamadı');
    }

    const token = integration.config as unknown as OpenBankingToken;
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    const url = `${this.apiBase}/accounts/${encodeURIComponent(accountRef)}/transactions?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token.accessToken}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      const err = await res.text();
      await this.prisma.tenantIntegration.update({
        where: { id: integration.id },
        data: { lastError: err.slice(0, 500) },
      });
      throw new BadRequestException('Banka hareketleri alınamadı');
    }

    const data = (await res.json()) as {
      transactions?: Array<{
        date: string;
        description?: string;
        amount: number;
        reference?: string;
      }>;
    };

    await this.prisma.tenantIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });

    return (data.transactions || []).map((t) => ({
      date: t.date,
      description: t.description || 'Banka hareketi',
      amount: t.amount,
      reference: t.reference,
    }));
  }
}
