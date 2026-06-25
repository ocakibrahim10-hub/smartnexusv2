import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { PortalService } from './portal.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('portal')
export class PortalController {
  constructor(private readonly svc: PortalService) {}

  @Post('login')
  @Public()
  login(@Body() body: { email: string; password: string }) {
    return this.svc.login(body.email, body.password);
  }

  @Get('orders')
  myOrders(@Request() req) {
    this.svc.assertPortalUser(req.user);
    return this.svc.getMyOrders(req.user.contactId, req.user.tenantId);
  }

  @Get('invoices')
  myInvoices(@Request() req) {
    this.svc.assertPortalUser(req.user);
    return this.svc.getMyInvoices(req.user.contactId, req.user.tenantId);
  }
}
