import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  @Get()
  findAll(@Request() req, @Query() q: any) {
    return this.svc.findAll(req.user.tenantId, q);
  }

  @Get('einvoice/stats')
  eInvoiceStats(@Request() req) {
    return this.svc.getEInvoiceStats(req.user.tenantId);
  }

  @Get('products/match')
  matchProducts(@Request() req, @Query('q') q: string, @Query('limit') limit?: string) {
    return this.svc.matchProducts(req.user.tenantId, q || '', limit ? parseInt(limit, 10) : 10);
  }

  @Post('purchase/import-einvoice')
  importPurchaseEInvoice(@Request() req, @Body() dto: any) {
    return this.svc.importPurchaseFromEInvoice(req.user.tenantId, dto);
  }

  @Post('einvoice/sync-inbox')
  syncInboxPurchases(@Request() req, @Body() dto: any) {
    return this.svc.syncInboxPurchases(req.user.tenantId, dto);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Request() req, @Body() dto: any) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Patch(':id/approve')
  approve(@Request() req, @Param('id') id: string) {
    return this.svc.approve(req.user.tenantId, id);
  }

  @Post(':id/payments')
  addPayment(@Request() req, @Param('id') id: string, @Body() dto: any) {
    const paymentType = dto.paymentType || dto.method || 'CASH';
    return this.svc.addPayment(req.user.tenantId, id, { ...dto, paymentType });
  }

  @Patch(':id/cancel')
  cancel(@Request() req, @Param('id') id: string, @Body('reason') reason: string) {
    return this.svc.cancel(req.user.tenantId, id, reason);
  }

  @Patch(':id/einvoice/send')
  sendEInvoice(@Request() req, @Param('id') id: string) {
    return this.svc.sendEInvoice(req.user.tenantId, id);
  }

  @Patch(':id/einvoice/cancel')
  cancelEInvoice(@Request() req, @Param('id') id: string) {
    return this.svc.cancelEInvoice(req.user.tenantId, id);
  }

  @Patch(':id/einvoice/accept')
  acceptEInvoice(@Request() req, @Param('id') id: string) {
    return this.svc.acceptEInvoice(req.user.tenantId, id);
  }

  @Patch(':id/einvoice/reject')
  rejectEInvoice(@Request() req, @Param('id') id: string) {
    return this.svc.rejectEInvoice(req.user.tenantId, id);
  }
}
