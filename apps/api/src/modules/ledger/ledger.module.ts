import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { ExportController } from './export.controller';

@Module({
  controllers: [LedgerController, ExportController],
})
export class LedgerApiModule {}
