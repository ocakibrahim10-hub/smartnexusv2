import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HrService } from './hr.service';

@ApiTags('hr')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('hr')
export class HrController {
  constructor(private readonly svc: HrService) {}

  @Get('personnel')
  getPersonnel(@Request() req) {
    return this.svc.getPersonnel(req.user.tenantId);
  }

  @Post('personnel')
  createPersonnel(@Request() req, @Body() dto: any) {
    return this.svc.createPersonnel(req.user.tenantId, dto);
  }

  @Post('personnel/:id/login')
  updatePersonnelLogin(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updatePersonnelLogin(req.user.tenantId, id, dto);
  }

  @Get('departments')
  getDepartments(@Request() req) {
    return this.svc.getDepartments(req.user.tenantId);
  }

  @Post('departments')
  createDepartment(@Request() req, @Body() dto: { name: string }) {
    return this.svc.createDepartment(req.user.tenantId, dto);
  }

  @Get('positions')
  getPositions(@Request() req) {
    return this.svc.getPositions(req.user.tenantId);
  }

  @Post('positions')
  createPosition(@Request() req, @Body() dto: { name: string }) {
    return this.svc.createPosition(req.user.tenantId, dto);
  }

  @Get('leaves')
  getLeaves(@Request() req) {
    return this.svc.getLeaves(req.user.tenantId);
  }

  @Post('leaves')
  createLeaveRequest(@Request() req, @Body() dto: any) {
    return this.svc.createLeaveRequest(req.user.tenantId, dto);
  }

  @Get('payroll')
  getPayrolls(@Request() req) {
    return this.svc.getPayrolls(req.user.tenantId);
  }

  @Post('payroll/generate')
  generatePayrollForMonth(@Request() req, @Body() dto: { month: number, year: number }) {
    return this.svc.generatePayrollForMonth(req.user.tenantId, dto.month, dto.year);
  }

  @Post('payroll/:id/pay')
  payPayroll(@Request() req, @Param('id') id: string, @Body() dto: { bankAccountId: string }) {
    return this.svc.payPayroll(req.user.tenantId, id, dto.bankAccountId);
  }
}
