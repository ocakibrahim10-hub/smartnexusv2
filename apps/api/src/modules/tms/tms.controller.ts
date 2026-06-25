import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TmsService } from './tms.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  CreateShipmentDto,
  UpdateShipmentDto,
} from './dto/tms.dto';

@ApiTags('TMS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tms')
export class TmsController {
  constructor(private readonly tmsService: TmsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'TMS dashboard metrikleri' })
  getDashboard(@Request() req: any) {
    return this.tmsService.getDashboard(req.user.tenantId);
  }

  // ─── Vehicles ───────────────────────────────────────────────────────────────
  @Get('vehicles')
  @ApiOperation({ summary: 'Araç listesi' })
  getVehicles(@Request() req: any, @Query() query: any) {
    return this.tmsService.getVehicles(req.user.tenantId, query);
  }

  @Post('vehicles')
  @ApiOperation({ summary: 'Yeni araç ekle' })
  createVehicle(@Request() req: any, @Body() dto: CreateVehicleDto) {
    return this.tmsService.createVehicle(req.user.tenantId, dto);
  }

  @Patch('vehicles/:id')
  @ApiOperation({ summary: 'Araç güncelle' })
  updateVehicle(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.tmsService.updateVehicle(req.user.tenantId, id, dto);
  }

  @Delete('vehicles/:id')
  @ApiOperation({ summary: 'Araç pasife al' })
  deleteVehicle(@Request() req: any, @Param('id') id: string) {
    return this.tmsService.deleteVehicle(req.user.tenantId, id);
  }

  // ─── Shipments ──────────────────────────────────────────────────────────────
  @Get('shipments')
  @ApiOperation({ summary: 'Sevkiyat listesi' })
  getShipments(@Request() req: any, @Query() query: any) {
    return this.tmsService.getShipments(req.user.tenantId, req.user, query);
  }

  @Get('shipments/:id')
  @ApiOperation({ summary: 'Sevkiyat detayı' })
  getShipment(@Request() req: any, @Param('id') id: string) {
    return this.tmsService.getShipment(req.user.tenantId, id);
  }

  @Post('shipments')
  @ApiOperation({ summary: 'Yeni sevkiyat oluştur' })
  createShipment(@Request() req: any, @Body() dto: CreateShipmentDto) {
    return this.tmsService.createShipment(req.user.tenantId, dto);
  }

  @Patch('shipments/:id')
  @ApiOperation({ summary: 'Sevkiyat güncelle' })
  updateShipment(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateShipmentDto) {
    return this.tmsService.updateShipment(req.user.tenantId, id, dto);
  }

  @Patch('shipments/:id/start')
  @ApiOperation({ summary: 'Sevkiyat yola çıkar (PLANNED → IN_TRANSIT)' })
  startShipment(@Request() req: any, @Param('id') id: string) {
    return this.tmsService.startShipment(req.user.tenantId, id);
  }

  @Patch('shipments/:id/deliver')
  @ApiOperation({ summary: 'Sevkiyat teslim edildi (IN_TRANSIT → DELIVERED)' })
  deliverShipment(@Request() req: any, @Param('id') id: string) {
    return this.tmsService.deliverShipment(req.user.tenantId, id);
  }

  @Patch('shipments/:id/fail')
  @ApiOperation({ summary: 'Sevkiyat başarısız (→ FAILED)' })
  failShipment(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.tmsService.failShipment(req.user.tenantId, id, body.reason);
  }

  @Patch('shipments/:id/cancel')
  @ApiOperation({ summary: 'Sevkiyat iptal et' })
  cancelShipment(@Request() req: any, @Param('id') id: string) {
    return this.tmsService.cancelShipment(req.user.tenantId, id);
  }

  @Post('shipments/:id/edispatch')
  @ApiOperation({ summary: 'E-irsaliye oluştur / gönder' })
  sendEDispatch(@Request() req: any, @Param('id') id: string) {
    return this.tmsService.sendEDispatch(req.user.tenantId, id);
  }

  @Post('shipments/:id/orders')
  @ApiOperation({ summary: 'Sevkiyata sipariş/adres ekle' })
  addShipmentOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { b2bOrderId?: string; address: string },
  ) {
    return this.tmsService.addShipmentOrder(
      req.user.tenantId,
      id,
      body.b2bOrderId ?? '',
      body.address,
    );
  }
}
