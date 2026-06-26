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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { B2bService } from './b2b.service';
import { CreateB2BOrderDto, UpdateB2BOrderDto, CreatePriceListDto } from './dto/b2b.dto';

@ApiTags('B2B')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'B2B dashboard metrikleri' })
  getDashboard(@Request() req: any) {
    return this.b2bService.getDashboard(req.user.tenantId);
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────
  @Get('orders')
  @ApiOperation({ summary: 'B2B sipariş listesi' })
  getOrders(@Request() req: any, @Query() query: any) {
    return this.b2bService.getOrders(req.user.tenantId, query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'B2B sipariş detayı' })
  getOrder(@Request() req: any, @Param('id') id: string) {
    return this.b2bService.getOrder(req.user.tenantId, id);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Yeni B2B sipariş oluştur' })
  createOrder(@Request() req: any, @Body() dto: CreateB2BOrderDto) {
    return this.b2bService.createOrder(req.user.tenantId, dto);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'B2B sipariş güncelle' })
  updateOrder(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateB2BOrderDto) {
    return this.b2bService.updateOrder(req.user.tenantId, id, dto);
  }

  @Patch('orders/:id/submit')
  @ApiOperation({ summary: 'Sipariş gönder (DRAFT → PENDING)' })
  submitOrder(@Request() req: any, @Param('id') id: string) {
    return this.b2bService.submitOrder(req.user.tenantId, id);
  }

  @Patch('orders/:id/approve')
  @ApiOperation({ summary: 'Sipariş onayla (PENDING → APPROVED)' })
  approveOrder(@Request() req: any, @Param('id') id: string) {
    return this.b2bService.approveOrder(req.user.tenantId, id);
  }

  @Patch('orders/:id/process')
  @ApiOperation({ summary: 'Sipariş işleme al (APPROVED → PROCESSING)' })
  processOrder(@Request() req: any, @Param('id') id: string) {
    return this.b2bService.processOrder(req.user.tenantId, id);
  }

  @Patch('orders/:id/ship')
  @ApiOperation({ summary: 'Sipariş kargoya ver (PROCESSING → SHIPPED)' })
  shipOrder(@Request() req: any, @Param('id') id: string) {
    return this.b2bService.shipOrder(req.user.tenantId, id);
  }

  @Patch('orders/:id/deliver')
  @ApiOperation({ summary: 'Sipariş teslim edildi (SHIPPED → DELIVERED)' })
  deliverOrder(@Request() req: any, @Param('id') id: string) {
    return this.b2bService.deliverOrder(req.user.tenantId, id);
  }

  @Patch('orders/:id/cancel')
  @ApiOperation({ summary: 'Sipariş iptal et' })
  cancelOrder(@Request() req: any, @Param('id') id: string) {
    return this.b2bService.cancelOrder(req.user.tenantId, id);
  }

  @Post('orders/:id/invoice')
  @ApiOperation({ summary: 'Siparişi Faturaya Dönüştür' })
  createInvoiceFromOrder(@Request() req: any, @Param('id') id: string) {
    return this.b2bService.createInvoiceFromOrder(req.user.tenantId, id, req.user.id);
  }

  // ─── Customers ───────────────────────────────────────────────────────────────
  @Get('customers')
  @ApiOperation({ summary: 'B2B müşteri listesi' })
  getCustomers(@Request() req: any, @Query() query: any) {
    return this.b2bService.getCustomers(req.user.tenantId, query);
  }

  @Patch('customers/:id/price-list')
  @ApiOperation({ summary: 'Müşteriye fiyat listesi ata' })
  assignPriceList(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { priceListId: string },
  ) {
    return this.b2bService.assignPriceList(req.user.tenantId, id, body.priceListId);
  }

  // ─── Price Lists ─────────────────────────────────────────────────────────────
  @Get('price-lists')
  @ApiOperation({ summary: 'Fiyat listeleri' })
  getPriceLists(@Request() req: any) {
    return this.b2bService.getPriceLists(req.user.tenantId);
  }

  @Post('price-lists')
  @ApiOperation({ summary: 'Yeni fiyat listesi oluştur' })
  createPriceList(@Request() req: any, @Body() dto: CreatePriceListDto) {
    return this.b2bService.createPriceList(req.user.tenantId, dto);
  }

  @Patch('price-lists/:id/items/:productId')
  @ApiOperation({ summary: 'Fiyat listesine ürün fiyatı ekle/güncelle' })
  setPriceListItem(
    @Request() req: any,
    @Param('id') priceListId: string,
    @Param('productId') productId: string,
    @Body() body: { price: number; minQuantity?: number },
  ) {
    return this.b2bService.setPriceListItem(
      req.user.tenantId,
      priceListId,
      productId,
      body.price,
      body.minQuantity,
    );
  }
}
