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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  findAll(@Request() req, @Query() q: any) {
    return this.svc.findAll(req.user.tenantId, q);
  }

  @Get('low-stock')
  getLowStock(@Request() req) {
    return this.svc.getLowStock(req.user.tenantId);
  }

  @Get('purchase-search')
  purchaseSearch(@Request() req, @Query('q') q: string) {
    return this.svc.searchForPurchase(req.user.tenantId, q || '');
  }

  @Post('barcodes/generate')
  bulkGenerateBarcodes(@Request() req, @Body() body: any) {
    return this.svc.bulkGenerateBarcodes(req.user.tenantId, body);
  }

  @Post('barcodes/labels')
  getBarcodeLabels(@Request() req, @Body() body: any) {
    return this.svc.getBarcodeLabels(req.user.tenantId, body);
  }

  @Get('categories')
  getCategories(@Request() req) {
    return this.svc.getCategories(req.user.tenantId);
  }

  @Post('categories')
  createCategory(@Request() req, @Body('name') name: string) {
    return this.svc.createCategory(req.user.tenantId, name);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Get(':id/movements')
  getMovements(@Request() req, @Param('id') id: string, @Query() q: any) {
    return this.svc.getMovements(req.user.tenantId, id, q);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateProductDto) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.svc.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.svc.remove(req.user.tenantId, id);
  }
}
