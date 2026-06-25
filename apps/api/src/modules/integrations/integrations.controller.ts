import { Controller, Get, Post, Body, Query, Request, Param } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { PaymentService } from './payments/payment.service';
import { EmailService } from './notifications/email.service';
import { ApiKeysService } from './api-keys/api-keys.service';
import { SmsService } from './notifications/sms.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private svc: IntegrationsService,
    private payments: PaymentService,
    private email: EmailService,
    private apiKeys: ApiKeysService,
    private sms: SmsService,
  ) {}

  @Get('status')
  getStatus(@Request() req) {
    return this.svc.getStatus(req.user.tenantId);
  }

  @Get('connections')
  listConnections(@Request() req) {
    return this.svc.listTenantIntegrations(req.user.tenantId);
  }

  @Post('open-banking/authorize')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  obAuthorize(
    @Request() req,
    @Body() body: { bankCode: string; bankAccountId?: string },
  ) {
    return this.svc.openBankingAuth(req.user.tenantId, body.bankCode, body.bankAccountId);
  }

  @Post('open-banking/callback')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  obCallback(@Request() req, @Body() body: { code: string; state: string }) {
    return this.svc.openBankingCallback(req.user.tenantId, body.code, body.state);
  }

  @Get('payments/providers')
  paymentProviders() {
    return this.payments.listProviders();
  }

  @Post('payments/charge')
  @Roles('OWNER', 'ADMIN', 'CASHIER')
  charge(@Request() req, @Body() body: any) {
    return this.payments.charge({ ...body, tenantId: req.user.tenantId });
  }

  @Post('payments/paytr/callback')
  @Public()
  paytrCallback(@Body() body: Record<string, string>) {
    return this.payments.handlePaytrCallback(body);
  }

  @Post('email/test')
  @Roles('OWNER', 'ADMIN')
  testEmail(@Body('to') to: string) {
    return this.svc.testEmail(to);
  }

  @Post('email/invoice/:invoiceId')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  emailInvoice(@Request() req, @Param('invoiceId') invoiceId: string) {
    return this.svc.emailInvoice(req.user.tenantId, invoiceId);
  }

  @Post('sms/test')
  @Roles('OWNER', 'ADMIN')
  testSms(@Body('phone') phone: string) {
    return this.svc.testSms(phone);
  }

  @Get('api-keys')
  @Roles('OWNER', 'ADMIN')
  listApiKeys(@Request() req) {
    return this.apiKeys.list(req.user.tenantId);
  }

  @Post('api-keys')
  @Roles('OWNER', 'ADMIN')
  createApiKey(@Request() req, @Body() body: { name: string; scopes?: string[] }) {
    return this.apiKeys.create(req.user.tenantId, req.user.tenantPlan, body);
  }

  @Post('api-keys/:id/revoke')
  @Roles('OWNER', 'ADMIN')
  revokeApiKey(@Request() req, @Param('id') id: string) {
    return this.apiKeys.revoke(req.user.tenantId, id);
  }
}
