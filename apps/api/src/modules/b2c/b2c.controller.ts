import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { B2cService } from './b2c.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleGuard } from '../../common/guards/module.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';

@Controller('b2c')
export class B2cController {
  constructor(private readonly b2cService: B2cService) {}

  @Get('integrations')
  @UseGuards(JwtAuthGuard, ModuleGuard)
  @RequireModule('B2C.MAIN')
  getIntegrations(@Request() req) {
    return this.b2cService.getB2cIntegrations(req.user.tenantId);
  }

  @Post('integrations/:provider')
  @UseGuards(JwtAuthGuard, ModuleGuard)
  @RequireModule('B2C.MAIN')
  setupIntegration(@Request() req, @Param('provider') provider: string, @Body() config: any) {
    return this.b2cService.setupIntegration(req.user.tenantId, provider, config);
  }

  // Webhooks are usually public but verified via signature
  @Post('webhook/:provider')
  handleWebhook(@Param('provider') provider: string, @Body() payload: any) {
    return this.b2cService.handleWebhook(provider, payload);
  }
}
