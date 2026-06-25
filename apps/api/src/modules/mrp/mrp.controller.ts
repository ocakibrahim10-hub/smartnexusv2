import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { MrpService } from './mrp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mrp')
@UseGuards(JwtAuthGuard)
export class MrpController {
  constructor(private readonly mrpService: MrpService) {}

  @Get('boms')
  getBoms(@Request() req: any) {
    return this.mrpService.getBoms(req.user.tenantId);
  }

  @Post('boms')
  createBom(@Request() req: any, @Body() body: any) {
    return this.mrpService.createBom(req.user.tenantId, body);
  }

  @Get('work-orders')
  getWorkOrders(@Request() req: any) {
    return this.mrpService.getWorkOrders(req.user.tenantId);
  }

  @Post('work-orders')
  createWorkOrder(@Request() req: any, @Body() body: any) {
    return this.mrpService.createWorkOrder(req.user.tenantId, body);
  }

  @Patch('work-orders/:id/status')
  updateWorkOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.mrpService.updateWorkOrderStatus(req.user.tenantId, id, status, req.user.id);
  }
}
