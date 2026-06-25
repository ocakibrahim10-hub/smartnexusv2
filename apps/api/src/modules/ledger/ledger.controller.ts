import { Controller, Get, Query, Request } from '@nestjs/common';
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

  @Get('journal')
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  journal(@Request() req, @Query() q: any) {
    return this.ledger.getJournalEntries(req.user.tenantId, q);
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

  @Get('audit-log')
  @Roles('OWNER', 'ADMIN')
  auditLog(@Request() req, @Query() q: any) {
    return this.audit.findAll(req.user.tenantId, q);
  }
}
