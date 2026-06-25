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
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  private isSuperAdmin(req: any) {
    return req.user?.tenantType === 'SUPERADMIN' || req.user?.role === 'SUPERADMIN';
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.supportService.getStats(req.user.tenantId, this.isSuperAdmin(req));
  }

  @Get('tickets')
  getTickets(@Request() req: any, @Query() query: any) {
    return this.supportService.getTickets(req.user.tenantId, query, this.isSuperAdmin(req));
  }

  @Get('tickets/:id')
  getTicket(@Param('id') id: string, @Request() req: any) {
    return this.supportService.getTicket(id, req.user.tenantId, this.isSuperAdmin(req));
  }

  @Post('tickets')
  createTicket(@Body() dto: any, @Request() req: any) {
    return this.supportService.createTicket(req.user.tenantId, dto, req.user.id);
  }

  @Patch('tickets/:id')
  updateTicket(@Param('id') id: string, @Body() dto: any) {
    return this.supportService.updateTicket(id, dto);
  }

  @Post('tickets/:id/messages')
  addMessage(@Param('id') id: string, @Body() body: { body: string }, @Request() req: any) {
    const isAdmin = this.isSuperAdmin(req);
    return this.supportService.addMessage(id, req.user.id, body.body, isAdmin);
  }

  @Patch('tickets/:id/resolve')
  resolveTicket(@Param('id') id: string) {
    return this.supportService.resolveTicket(id);
  }

  @Patch('tickets/:id/close')
  closeTicket(@Param('id') id: string) {
    return this.supportService.closeTicket(id);
  }
}
