import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { AddonModuleCode, CommissionInvoiceStatus } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformController {
  constructor(private platform: PlatformService) {}

  @Get('health')
  @ApiOperation({ summary: 'Sistem sağlık durumu' })
  getHealth(@Request() req: any) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.getSystemHealth();
  }

  @Get('boss')
  @ApiOperation({ summary: 'Platform boss ekranı' })
  getBoss(@Request() req: any, @Query('period') period?: 'day' | 'week' | 'month' | 'year') {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.getPlatformBossScreen(period || 'month');
  }

  @Get('tenants/:id/report')
  @ApiOperation({ summary: 'İşletme/bayi detay raporu' })
  getTenantReport(@Request() req: any, @Param('id') id: string) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.getTenantDetailReport(id);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Addon modül listesi' })
  listModules(@Request() req: any) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.listAddonModules();
  }

  @Post('modules')
  upsertModule(@Request() req: any, @Body() body: any) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.upsertAddonModule(body);
  }

  @Post('kontor-packages')
  createPackage(@Request() req: any, @Body() body: any) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.createKontorPackage(body);
  }

  @Patch('kontor-packages/:id')
  updatePackage(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.updateKontorPackage(id, body);
  }

  @Get('plans/:plan/modules')
  getPlanModules(@Request() req: any, @Param('plan') plan: string) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.getPlanModules(plan);
  }

  @Post('plans/:plan/modules')
  setPlanModules(
    @Request() req: any,
    @Param('plan') plan: string,
    @Body('moduleCodes') moduleCodes: AddonModuleCode[],
  ) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.setPlanModules(plan, moduleCodes || []);
  }

  @Get('kontor/summary')
  getKontorSummary(@Request() req: any) {
    return this.platform.getKontorSummary(req.user.tenantId);
  }

  @Get('kontor/balances')
  getBalances(@Request() req: any) {
    return this.platform.getKontorSummary(req.user.tenantId);
  }

  @Post('kontor/purchase')
  purchaseKontor(@Request() req: any, @Body() body: { packageId: string }) {
    return this.platform.initiateKontorPurchase(
      req.user.tenantId,
      req.user.id,
      body.packageId,
      {
        email: req.user.email,
        name: req.user.name || 'Kullanıcı',
        phone: body['phone'],
      },
    );
  }

  @Post('subscription/quote')
  async quoteSubscription(
    @Request() req: any,
    @Body()
    body: {
      plan: string;
      addonCodes?: AddonModuleCode[];
      extraBranchCount?: number;
      tenantId?: string;
      extensionMonths?: number;
      billingMode?: 'new' | 'upgrade' | 'renewal';
      includeAnnualRenewal?: boolean;
    },
  ) {
    const tenantId = body.tenantId || req.user?.tenantId;
    let currentSubscription;
    if (tenantId && body.billingMode && body.billingMode !== 'new') {
      const ctx = await this.platform.getTenantSubscriptionQuoteContext(tenantId);
      if (ctx) {
        currentSubscription = {
          plan: ctx.plan,
          price: ctx.price,
          endDate: ctx.endDate,
        };
      }
    }
    return this.platform.quoteSubscription(body.plan, body.addonCodes || [], body.extraBranchCount || 0, {
      currentSubscription,
      extensionMonths: body.extensionMonths ?? 0,
      billingMode: body.billingMode ?? 'new',
    });
  }

  @Public()
  @Post('subscription/quote-public')
  quoteSubscriptionPublic(
    @Body()
    body: {
      plan: string;
      addonCodes?: AddonModuleCode[];
      extraBranchCount?: number;
      extensionMonths?: number;
      billingMode?: 'new' | 'upgrade' | 'renewal';
    },
  ) {
    return this.platform.quoteSubscription(body.plan, body.addonCodes || [], body.extraBranchCount || 0, {
      extensionMonths: body.extensionMonths ?? 0,
      billingMode: body.billingMode ?? 'new',
    });
  }

  @Post('subscription/purchase')
  purchaseSubscription(
    @Request() req: any,
    @Body()
    body: {
      tenantId?: string;
      plan: string;
      addonCodes?: AddonModuleCode[];
      extraBranchCount?: number;
      extensionMonths?: number;
      includeAnnualRenewal?: boolean;
      billingMode?: 'new' | 'upgrade' | 'renewal';
      phone?: string;
      acceptedDocuments?: string[];
    },
  ) {
    const tenantId = body.tenantId || req.user.tenantId;
    return this.platform.initiateSubscriptionPurchase(req.user, {
      tenantId,
      plan: body.plan,
      addonCodes: body.addonCodes,
      extraBranchCount: body.extraBranchCount,
      extensionMonths: body.extensionMonths,
      includeAnnualRenewal: body.includeAnnualRenewal,
      billingMode: body.billingMode,
      acceptedDocuments: body.acceptedDocuments as any,
      buyer: {
        email: req.user.email,
        name: req.user.name || 'Kullanıcı',
        phone: body.phone,
      },
    });
  }

  @Get('kontor/packages')
  listKontorPackages() {
    return this.platform.listKontorModules();
  }

  @Get('addons')
  listSubscriptionAddons() {
    return this.platform.listSubscriptionAddons();
  }

  @Public()
  @Get('pricing/public')
  getPublicPricing() {
    return this.platform.getPublicPricing();
  }

  @Get('reports')
  @ApiOperation({ summary: 'Platform özet raporları' })
  getPlatformReports(@Request() req: any, @Query('period') period?: 'day' | 'week' | 'month' | 'year') {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.getPlatformReports(period || 'month');
  }

  @Get('commission-invoices')
  listInvoices(@Request() req: any) {
    return this.platform.listCommissionInvoices(req.user.tenantId, req.user.tenantType);
  }

  @Post('commission-invoices')
  createInvoice(@Request() req: any, @Body() body: any) {
    if (req.user.tenantType !== 'DEALER') {
      this.platform.assertSuperAdmin(req.user.tenantType);
    }
    const dealerId = req.user.tenantType === 'DEALER' ? req.user.tenantId : body.dealerId;
    return this.platform.createCommissionInvoice(dealerId, body);
  }

  @Post('commission-invoices/:id/send')
  sendInvoice(@Request() req: any, @Param('id') id: string) {
    return this.platform.sendCommissionInvoice(req.user.tenantId, id);
  }

  @Patch('commission-invoices/:id/status')
  updateInvoiceStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: CommissionInvoiceStatus; rejectedReason?: string },
  ) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.updateCommissionInvoiceStatus(id, body.status, body.rejectedReason);
  }

  @Get('notifications')
  listNotifications(@Request() req: any) {
    return this.platform.listNotifications(req.user.tenantId, req.user.tenantType);
  }

  @Patch('notifications/:id/read')
  markRead(@Param('id') id: string) {
    return this.platform.markNotificationRead(id);
  }

  @Public()
  @Get('legal/documents')
  @ApiOperation({ summary: 'Sözleşme metinleri' })
  listLegalDocuments(@Query('context') context?: string) {
    return this.platform.listLegalDocuments(context);
  }

  @Public()
  @Get('legal/documents/:id')
  @ApiOperation({ summary: 'Tek sözleşme metni' })
  getLegalDocument(@Param('id') id: string) {
    return this.platform.getLegalDocument(id);
  }

  @Get('chatbot-settings')
  @ApiOperation({ summary: 'Nexus Asistan yapılandırması (SuperAdmin)' })
  getChatbotSettings(@Request() req: any) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.getChatbotSettingsAdmin();
  }

  @Patch('chatbot-settings')
  @ApiOperation({ summary: 'Nexus Asistan ayarlarını güncelle' })
  updateChatbotSettings(@Request() req: any, @Body() body: any) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.updateChatbotSettings(body);
  }

  @Post('chatbot-settings/test')
  @ApiOperation({ summary: 'Nexus Asistan API bağlantı testi' })
  testChatbotSettings(@Request() req: any) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.testChatbotConnection();
  }

  @Get('chatbot-settings/ollama-models')
  @ApiOperation({ summary: 'Ollama yüklü modelleri listele' })
  listOllamaModels(@Request() req: any, @Query('baseUrl') baseUrl?: string) {
    this.platform.assertSuperAdmin(req.user.tenantType);
    return this.platform.listOllamaModels(baseUrl);
  }

  @Public()
  @Get('chatbot/public')
  getChatbotPublic() {
    return this.platform.getChatbotPublicStatus();
  }

  @Public()
  @Get('chatbot/runtime')
  getChatbotRuntime(@Headers('x-chat-runtime-key') key?: string) {
    const expected =
      process.env.CHAT_RUNTIME_SECRET ||
      process.env.JWT_SECRET ||
      'smartnexus-chat-runtime';
    if (!key || key !== expected) {
      throw new UnauthorizedException('Geçersiz runtime anahtarı');
    }
    return this.platform.getChatbotRuntimeConfig();
  }
}
