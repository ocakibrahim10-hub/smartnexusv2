import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { LedgerService } from '../../common/ledger.service';
import { AuditService } from '../../common/audit.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('ledger')
export class LedgerController {
  constructor(
    private ledger: LedgerService,
    private audit: AuditService,
  ) {}

  @Get('trial-balance')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  trialBalance(@Request() req, @Query('asOf') asOf?: string) {
    return this.ledger.getTrialBalance(req.user.tenantId, asOf);
  }

  @Get('balance-sheet')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  balanceSheet(@Request() req, @Query('asOf') asOf?: string) {
    return this.ledger.getBalanceSheet(req.user.tenantId, asOf);
  }

  @Get('accounts')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  getAccounts(@Request() req) {
    return this.ledger.getAccounts(req.user.tenantId);
  }

  @Post('accounts')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  createAccount(@Request() req, @Body() data: any) {
    return this.ledger.createAccount(req.user.tenantId, data);
  }

  @Put('accounts/:id')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  updateAccount(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.ledger.updateAccount(req.user.tenantId, id, data);
  }

  @Delete('accounts/:id')
  @Roles('OWNER', 'ADMIN')
  deleteAccount(@Request() req, @Param('id') id: string) {
    return this.ledger.deleteAccount(req.user.tenantId, id);
  }

  @Get('journal')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  journal(@Request() req, @Query() q: any) {
    return this.ledger.getJournalEntries(req.user.tenantId, q);
  }

  @Post('journal')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  createJournal(@Request() req, @Body() data: any) {
    return this.ledger.createManualJournal(req.user.tenantId, data);
  }

  @Get('tax-report')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  taxReport(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.ledger.getTaxReport(
      req.user.tenantId,
      startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate || new Date().toISOString().split('T')[0],
    );
  }

  @Get('income-statement')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  incomeStatement(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.ledger.getIncomeStatement(
      req.user.tenantId,
      startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate || new Date().toISOString().split('T')[0],
    );
  }

  @Get('babs')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  getBaBsReport(
    @Request() req,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.ledger.getBaBsReport(
      req.user.tenantId,
      Number(year || new Date().getFullYear()),
      Number(month || new Date().getMonth() + 1),
    );
  }

  @Post('close-period')
  @Roles('OWNER', 'ACCOUNTANT')
  closePeriod(@Request() req, @Body() data: { endDate: string }) {
    return this.ledger.closePeriod(req.user.tenantId, data.endDate);
  }

  @Get('audit-log')
  @Roles('OWNER', 'ADMIN')
  auditLog(@Request() req, @Query() q: any) {
    return this.audit.findAll(req.user.tenantId, q);
  }
}
