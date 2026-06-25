import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateWarehouseDto,
  StockMovementDto,
  CreateTransferDto,
  StockCountDto,
  CreateStockRequestDto,
} from './dto/inventory.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  // Dashboard
  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.svc.getDashboardMetrics(req.user.tenantId);
  }

  // AI Talep Tahmini
  @Get('forecast')
  getForecast(@Request() req) {
    return this.svc.getForecast(req.user.tenantId);
  }

  // Düşük stok uyarıları
  @Get('low-stock')
  getLowStock(@Request() req) {
    return this.svc.getLowStockItems(req.user.tenantId);
  }

  // Depolar
  @Get('warehouses')
  getWarehouses(@Request() req) {
    return this.svc.getWarehouses(req.user.tenantId);
  }

  @Post('warehouses')
  createWarehouse(@Request() req, @Body() dto: CreateWarehouseDto) {
    return this.svc.createWarehouse(req.user.tenantId, dto);
  }

  @Patch('warehouses/:id')
  updateWarehouse(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWarehouseDto>,
  ) {
    return this.svc.updateWarehouse(req.user.tenantId, id, dto);
  }

  @Get('warehouses/:id/stock')
  getWarehouseStock(@Request() req, @Param('id') id: string, @Query() q: any) {
    return this.svc.getWarehouseStock(req.user.tenantId, id, q);
  }

  // Stok hareketleri
  @Get('movements')
  getMovements(@Request() req, @Query() q: any) {
    return this.svc.getMovements(req.user.tenantId, q);
  }

  @Post('movements')
  addMovement(@Request() req, @Body() dto: StockMovementDto) {
    return this.svc.addMovement(req.user.tenantId, req.user.id, dto);
  }

  @Get('parent-stock')
  getParentStock(@Request() req, @Query() q: any) {
    return this.svc.getParentStock(req.user.tenantId, q);
  }

  @Post('stock-requests')
  createStockRequest(@Request() req, @Body() dto: CreateStockRequestDto) {
    return this.svc.createStockRequest(req.user.tenantId, req.user.id, dto);
  }

  // Stok sayımı
  @Post('count')
  doStockCount(@Request() req, @Body() dto: StockCountDto) {
    return this.svc.doStockCount(req.user.tenantId, req.user.id, dto);
  }

  // Transfer emirleri
  @Get('transfers')
  getTransfers(@Request() req, @Query() q: any) {
    return this.svc.getTransfers(req.user.tenantId, q);
  }

  @Post('transfers')
  createTransfer(@Request() req, @Body() dto: CreateTransferDto) {
    return this.svc.createTransfer(req.user.tenantId, req.user.id, dto);
  }

  @Patch('transfers/:id/approve')
  approveTransfer(@Request() req, @Param('id') id: string) {
    return this.svc.approveTransfer(req.user.tenantId, id);
  }

  @Patch('transfers/:id/ship')
  shipTransfer(@Request() req, @Param('id') id: string) {
    return this.svc.shipTransfer(req.user.tenantId, id, req.user.id);
  }

  @Patch('transfers/:id/receive')
  receiveTransfer(@Request() req, @Param('id') id: string) {
    return this.svc.receiveTransfer(req.user.tenantId, id, req.user.id);
  }

  @Patch('transfers/:id/cancel')
  cancelTransfer(@Request() req, @Param('id') id: string) {
    return this.svc.cancelTransfer(req.user.tenantId, id);
  }
}
