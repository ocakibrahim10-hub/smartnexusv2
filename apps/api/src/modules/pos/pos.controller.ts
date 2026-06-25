import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { POSService } from './pos.service';
import { HuginService } from '../hugin/hugin.service';

@ApiTags('pos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('pos')
export class POSController {
  constructor(
    private readonly svc: POSService,
    private readonly hugin: HuginService,
  ) {}

  @Get('products')
  searchProducts(@Request() req, @Query('q') q: string) {
    return this.svc.searchProducts(req.user.tenantId, q || '');
  }

  @Get('products/grid')
  getProductGrid(@Request() req, @Query('categoryId') categoryId: string) {
    return this.svc.getProductGrid(req.user.tenantId, categoryId);
  }

  @Get('categories')
  getCategories(@Request() req) {
    return this.svc.getCategories(req.user.tenantId);
  }

  @Post('sessions/open')
  openSession(@Request() req, @Body() body: { openingCash?: number }) {
    return this.svc.openSession(req.user.tenantId, req.user.id, body.openingCash || 0);
  }

  @Patch('sessions/:id/close')
  closeSession(@Request() req, @Param('id') id: string, @Body() body: { closingCash: number }) {
    return this.svc.closeSession(req.user.tenantId, id, body.closingCash);
  }

  @Get('sessions/:id/summary')
  getSessionSummary(@Request() req, @Param('id') id: string) {
    return this.svc.getSessionSummary(req.user.tenantId, id);
  }

  @Post('checkout')
  checkout(@Request() req, @Body() dto: any) {
    return this.svc.checkout(req.user.tenantId, dto);
  }

  @Patch('receipts/:id/cancel')
  cancelReceipt(@Request() req, @Param('id') id: string, @Body('reason') reason: string) {
    return this.svc.cancelReceipt(req.user.tenantId, id, reason);
  }

  @Get('history')
  getHistory(@Request() req, @Query() q: any) {
    return this.svc.getHistory(req.user.tenantId, q);
  }

  @Get('hugin/status')
  huginStatus() {
    return this.hugin.getStatus();
  }

  @Post('hugin/z-report')
  huginZReport() {
    return this.hugin.printZReport();
  }
}
