import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CashModule } from '../cash/cash.module';

@Module({
  imports: [CashModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
