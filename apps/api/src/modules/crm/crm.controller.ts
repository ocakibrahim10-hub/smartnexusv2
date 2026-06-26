import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';

@Controller('crm')
@UseGuards(JwtAuthGuard, ModuleGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('leads')
  @RequireModule('CRM.LEADS')
  getLeads(@Request() req) {
    return this.crmService.getLeads(req.user.tenantId);
  }

  @Post('leads')
  @RequireModule('CRM.LEADS')
  createLead(@Request() req, @Body() data: any) {
    return this.crmService.createLead(req.user.tenantId, data);
  }

  @Patch('leads/:id/status')
  @RequireModule('CRM.LEADS')
  updateLeadStatus(@Request() req, @Param('id') id: string, @Body() body: { status: string }) {
    return this.crmService.updateLeadStatus(req.user.tenantId, id, body.status);
  }

  @Get('deals')
  @RequireModule('CRM.PIPELINE')
  getDeals(@Request() req) {
    return this.crmService.getDeals(req.user.tenantId);
  }

  @Post('deals')
  @RequireModule('CRM.PIPELINE')
  createDeal(@Request() req, @Body() data: any) {
    return this.crmService.createDeal(req.user.tenantId, data);
  }

  @Patch('deals/:id/stage')
  @RequireModule('CRM.PIPELINE')
  updateDealStage(@Request() req, @Param('id') id: string, @Body() body: { stage: string }) {
    return this.crmService.updateDealStage(req.user.tenantId, id, body.stage);
  }

  @Get('activities')
  @RequireModule('CRM.PIPELINE', 'CRM.LEADS')
  getActivities(@Request() req) {
    return this.crmService.getActivities(req.user.tenantId);
  }

  @Post('activities')
  @RequireModule('CRM.PIPELINE', 'CRM.LEADS')
  createActivity(@Request() req, @Body() data: any) {
    return this.crmService.createActivity(req.user.tenantId, data);
  }
}
