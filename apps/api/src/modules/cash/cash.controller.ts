import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CashService } from './cash.service';

@ApiTags('cash')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('cash')
export class CashController {
  constructor(private readonly svc: CashService) {}

  @Get('accounts')
  getCashAccounts(@Request() req) {
    return this.svc.getCashAccounts(req.user.tenantId);
  }

  @Post('accounts')
  createCashAccount(@Request() req, @Body() dto: any) {
    return this.svc.createCashAccount(req.user.tenantId, dto);
  }

  @Get('accounts/:id/transactions')
  getCashTx(@Request() req, @Param('id') id: string, @Query() q: any) {
    return this.svc.getCashTransactions(req.user.tenantId, id, q);
  }

  @Post('accounts/:id/transactions')
  addCashTx(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.svc.addCashTransaction(req.user.tenantId, { ...dto, cashAccountId: id });
  }

  @Get('bank-accounts')
  getBankAccounts(@Request() req) {
    return this.svc.getBankAccounts(req.user.tenantId);
  }

  @Post('bank-accounts')
  createBankAccount(@Request() req, @Body() dto: any) {
    return this.svc.createBankAccount(req.user.tenantId, dto);
  }

  @Get('bank-accounts/:id/transactions')
  getBankTx(@Request() req, @Param('id') id: string, @Query() q: any) {
    return this.svc.getBankTransactions(req.user.tenantId, id, q);
  }

  @Post('bank-accounts/:id/transactions')
  addBankTx(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.svc.addBankTransaction(req.user.tenantId, { ...dto, bankAccountId: id });
  }

  @Post('transfer')
  transfer(@Request() req, @Body() dto: any) {
    return this.svc.transfer(req.user.tenantId, dto);
  }

  @Get('flow')
  getCashFlow(@Request() req, @Query('days') days: string) {
    return this.svc.getCashFlow(req.user.tenantId, parseInt(days || '30'));
  }

  @Post('quick-sale-check')
  addQuickSaleCheck(@Request() req, @Body() dto: any) {
    return this.svc.addQuickSaleCheck(req.user.tenantId, dto);
  }

  @Get('checks')
  getChecks(@Request() req, @Query() q: any) {
    return this.svc.getChecksReport(req.user.tenantId, q);
  }

  @Get('check-register')
  getCheckRegister(@Request() req, @Query() q: any) {
    return this.svc.getCheckRegister(req.user.tenantId, q);
  }

  @Get('check-alerts')
  getCheckAlerts(@Request() req) {
    return this.svc.getCheckAlerts(req.user.tenantId);
  }

  @Post('check-register/:id/status')
  updateCheckRegisterStatus(@Request() req, @Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateCheckRegisterStatus(req.user.tenantId, id, status);
  }

  @Post('checks/:id/status')
  updateCheckStatus(@Request() req, @Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateCheckStatus(req.user.tenantId, id, status);
  }

  @Get('banks/supported')
  getSupportedBanks() {
    return this.svc.getSupportedBanks();
  }

  @Post('bank-accounts/:id/import-statement')
  importStatement(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { lines: Array<{ date?: string; description?: string; amount: number; reference?: string }> },
  ) {
    return this.svc.importBankStatement(req.user.tenantId, id, body.lines || []);
  }

  @Get('bank-accounts/:id/unreconciled')
  getUnreconciled(@Request() req, @Param('id') id: string) {
    return this.svc.getUnreconciledBankTransactions(req.user.tenantId, id);
  }

  @Post('bank-accounts/:id/sync-open-banking')
  syncOpenBanking(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { dateFrom?: string; dateTo?: string },
  ) {
    return this.svc.syncOpenBanking(req.user.tenantId, id, body);
  }

  @Post('bank-transactions/:id/reconcile')
  reconcile(@Request() req, @Param('id') id: string, @Body() dto: { invoiceId?: string; contactId?: string }) {
    return this.svc.reconcileBankTransaction(req.user.tenantId, id, dto);
  }
}
