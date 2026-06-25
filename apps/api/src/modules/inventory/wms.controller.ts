import {
  Controller, Get, Post, Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WmsService } from './wms.service';

@ApiTags('wms')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wms')
export class WmsController {
  constructor(private readonly svc: WmsService) {}

  // ─── LOKASYONLAR ─────────────────────────────────────────────────────
  @Get('locations')
  getLocations(@Request() req, @Query() q: any) {
    return this.svc.getLocations(req.user.tenantId, q);
  }

  @Post('locations')
  createLocation(@Request() req, @Body() dto: any) {
    return this.svc.createLocation(req.user.tenantId, dto);
  }

  @Post('locations/bulk')
  bulkCreateLocations(@Request() req, @Body() dto: any) {
    return this.svc.bulkCreateLocations(req.user.tenantId, dto);
  }

  // ─── BARKOD İŞLEMLERİ ────────────────────────────────────────────────
  @Get('scan/:barcode')
  scanBarcode(@Request() req, @Param('barcode') barcode: string) {
    return this.svc.scanBarcode(req.user.tenantId, barcode);
  }

  @Post('receive')
  barcodeReceive(@Request() req, @Body() dto: any) {
    return this.svc.barcodeReceive(req.user.tenantId, req.user.id, dto);
  }

  @Post('dispatch')
  barcodeDispatch(@Request() req, @Body() dto: any) {
    return this.svc.barcodeDispatch(req.user.tenantId, req.user.id, dto);
  }

  @Post('move')
  moveToLocation(@Request() req, @Body() dto: any) {
    return this.svc.moveToLocation(req.user.tenantId, req.user.id, dto);
  }

  // ─── HIZLI SAYIM ─────────────────────────────────────────────────────
  @Post('quick-count')
  quickCount(@Request() req, @Body() dto: any) {
    return this.svc.quickCount(req.user.tenantId, req.user.id, dto);
  }

  // ─── TOPLAMA (PİCKİNG) ───────────────────────────────────────────────
  @Get('pick-list/:warehouseId')
  getPickList(@Request() req, @Param('warehouseId') warehouseId: string) {
    return this.svc.getPickList(req.user.tenantId, warehouseId);
  }
}
