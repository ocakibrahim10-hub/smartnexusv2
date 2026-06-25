import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { MobileService } from './mobile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';

@Controller('mobile')
@UseGuards(JwtAuthGuard, ModuleGuard)
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('dashboard')
  @RequireModule('MOBILE.MAIN')
  getDashboard(@Request() req) {
    return this.mobileService.getDashboardSummary(req.user.tenantId);
  }

  @Post('sync')
  @RequireModule('MOBILE.MAIN')
  syncOfflineData(@Request() req, @Body() data: any) {
    return this.mobileService.syncOfflineData(req.user.tenantId, data);
  }
}
