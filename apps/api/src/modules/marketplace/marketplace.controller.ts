import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService, MarketplacePlatform } from './marketplace.service';

@ApiTags('marketplace')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly svc: MarketplaceService) {}

  @Get('connections')
  getConnections(@Request() req) {
    return this.svc.getConnections(req.user.tenantId);
  }

  @Post('connections/:platform')
  connectPlatform(
    @Request() req,
    @Param('platform') platform: MarketplacePlatform,
    @Body() dto: { apiKey: string; sellerId: string; apiSecret?: string },
  ) {
    return this.svc.connectPlatform(req.user.tenantId, platform, dto);
  }

  @Delete('connections/:platform')
  disconnectPlatform(@Request() req, @Param('platform') platform: MarketplacePlatform) {
    return this.svc.disconnectPlatform(req.user.tenantId, platform);
  }

  @Get('orders')
  getOrders(@Request() req, @Query('platform') platform?: MarketplacePlatform) {
    return this.svc.getOrders(req.user.tenantId, platform);
  }

  @Get('listings')
  getListings(@Request() req, @Query('platform') platform?: MarketplacePlatform) {
    return this.svc.getListings(req.user.tenantId, platform);
  }

  @Post('sync/:platform')
  syncStock(@Request() req, @Param('platform') platform: MarketplacePlatform) {
    return this.svc.syncStock(req.user.tenantId, platform);
  }

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.svc.getDashboard(req.user.tenantId);
  }
}
