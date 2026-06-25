import { Module } from '@nestjs/common';
import { POSController } from './pos.controller';
import { POSService } from './pos.service';
import { HuginModule } from '../hugin/hugin.module';

@Module({
  imports: [HuginModule],
  controllers: [POSController],
  providers: [POSService],
  exports: [POSService],
})
export class POSModule {}
