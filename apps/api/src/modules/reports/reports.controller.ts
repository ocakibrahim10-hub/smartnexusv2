import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CashService } from '../cash/cash.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly svc: ReportsService,
    private readonly cashSvc: CashService,
  ) {}

  @Get('boss-screen')
  getBossScreen(@Request() req) {
    return this.svc.getBossScreen(req.user.tenantId, req.user.tenantType);
  }

  @Get('sales')
  getSales(@Request() req, @Query() q: any) {
    return this.svc.getSalesReport(req.user.tenantId, q);
  }

  @Get('profit-loss')
  getProfitLoss(@Request() req, @Query('startDate') s: string, @Query('endDate') e: string) {
    return this.svc.getProfitLoss(req.user.tenantId, s, e);
  }

  @Get('inventory-valuation')
  getInventoryValuation(@Request() req) {
    return this.svc.getInventoryValuation(req.user.tenantId);
  }

  @Get('checks')
  getChecks(@Request() req, @Query() q: any) {
    return this.cashSvc.getChecksReport(req.user.tenantId, q);
  }

  @Get('dealers')
  getDealerReport(@Request() req, @Query('startDate') s: string, @Query('endDate') e: string) {
    return this.svc.getDealerReport(req.user.tenantId, s, e);
  }

  @Get('dealer/commission')
  getDealerCommission(@Request() req) {
    return this.svc.getDealerCommission(req.user.tenantId);
  }

  @Get('dealer/billing')
  getDealerBilling(@Request() req) {
    return this.svc.getDealerBilling(req.user.tenantId);
  }

  @Get('dealer/advanced')
  getDealerAdvanced(@Request() req) {
    return this.svc.getDealerAdvancedReport(req.user.tenantId);
  }

  @Get('vat')
  getVat(@Request() req, @Query('startDate') s: string, @Query('endDate') e: string) {
    const start =
      s || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = e || new Date().toISOString().split('T')[0];
    return this.svc.getVatReport(req.user.tenantId, start, end);
  }

  @Get('admin/commission')
  getAdminCommission(@Request() req) {
    return this.svc.getAdminCommissionOverview(req.user.tenantType);
  }
}
