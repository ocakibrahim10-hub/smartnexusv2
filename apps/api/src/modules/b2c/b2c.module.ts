import { Module } from '@nestjs/common';
import { B2cService } from './b2c.service';
import { B2cController } from './b2c.controller';

@Module({
  controllers: [B2cController],
  providers: [B2cService],
})
export class B2cModule {}
