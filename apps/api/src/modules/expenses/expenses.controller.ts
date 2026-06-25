import { Controller, Get, Post, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  @Get()
  findAll(@Request() req, @Query() q: any) {
    return this.svc.findAll(req.user.tenantId, q);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  create(@Request() req, @Body() dto: any) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  remove(@Request() req, @Param('id') id: string) {
    return this.svc.remove(req.user.tenantId, id);
  }

  @Post('portal-access/:contactId')
  @Roles('OWNER', 'ADMIN')
  enablePortal(
    @Request() req,
    @Param('contactId') contactId: string,
    @Body('password') password: string,
  ) {
    return this.svc.enablePortalAccess(req.user.tenantId, contactId, password);
  }
}
