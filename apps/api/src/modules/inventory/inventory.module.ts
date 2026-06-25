import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { WmsController } from './wms.controller';
import { WmsService } from './wms.service';

@Module({
  controllers: [InventoryController, WmsController],
  providers: [InventoryService, WmsService],
  exports: [InventoryService, WmsService],
})
export class InventoryModule {}
