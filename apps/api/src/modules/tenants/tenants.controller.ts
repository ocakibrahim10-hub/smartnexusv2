import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { InventoryService } from '../inventory/inventory.service';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.tenantsService.getSuperAdminDashboard(req.user);
  }

  @Get('dealers')
  getDealers(@Request() req, @Query() query: any) {
    return this.tenantsService.getDealers(req.user, query);
  }

  @Get('businesses')
  getBusinesses(@Request() req, @Query() query: any) {
    return this.tenantsService.getBusinesses(req.user, query);
  }

  @Get('branches')
  getBranches(@Request() req, @Query() query: any) {
    return this.tenantsService.getBranches(req.user, query);
  }

  @Get('subscriptions')
  getSubscriptions(@Request() req, @Query() query: any) {
    return this.tenantsService.getSubscriptions(req.user, query);
  }

  @Get('plan-templates')
  getPlanTemplates() {
    return this.tenantsService.getPlanTemplates();
  }

  @Patch('plan-templates/:plan')
  updatePlanTemplate(@Request() req, @Param('plan') plan: string, @Body() dto: any) {
    return this.tenantsService.updatePlanTemplate(req.user, plan, dto);
  }

  @Post('subscriptions/:tenantId')
  upsertSubscription(@Request() req, @Param('tenantId') tenantId: string, @Body() dto: any) {
    return this.tenantsService.upsertSubscription(req.user, tenantId, dto);
  }

  @Get('subscriptions/status')
  getSubscriptionStatus(@Request() req, @Query('tenantId') tenantId?: string) {
    return this.tenantsService.getSubscriptionStatus(req.user, tenantId);
  }

  @Patch('subscriptions/:tenantId/renew')
  renewSubscription(
    @Request() req,
    @Param('tenantId') tenantId: string,
    @Body() body: { months?: number },
  ) {
    return this.tenantsService.renewSubscription(req.user, tenantId, body.months);
  }

  @Get('plan-usage')
  getPlanUsage(@Request() req) {
    return this.tenantsService.getPlanUsage(req.user.tenantId);
  }

  @Get(':id')
  getTenant(@Request() req, @Param('id') id: string) {
    return this.tenantsService.getTenant(req.user, id);
  }

  @Post()
  createTenant(@Request() req, @Body() dto: any) {
    return this.tenantsService.createTenant(req.user, dto);
  }

  @Patch(':id')
  updateTenant(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.tenantsService.updateTenant(req.user, id, dto);
  }

  @Delete(':id')
  deactivateTenant(@Request() req, @Param('id') id: string) {
    return this.tenantsService.deactivateTenant(req.user, id);
  }

  @Post(':id/users')
  async createTenantUser(@Request() req, @Param('id') id: string, @Body() dto: any) {
    const scopeIds = await this.tenantsService.getScopeIds(req.user);
    this.tenantsService.assertInScope(req.user, id, scopeIds);
    return this.usersService.create(id, req.user.role, dto);
  }

  @Get(':id/inventory-dashboard')
  async getTenantInventoryDashboard(@Request() req, @Param('id') id: string) {
    const scopeIds = await this.tenantsService.getScopeIds(req.user);
    this.tenantsService.assertInScope(req.user, id, scopeIds);
    return this.inventoryService.getDashboardMetrics(id);
  }
}
